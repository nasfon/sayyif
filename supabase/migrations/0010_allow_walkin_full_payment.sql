-- ============================================================================
-- IMS — Allow walk-in sales with full payment
--
-- Migration 0009 required a customer for every sale. Business rule updated:
-- walk-in buyers (null customer) may purchase but must pay in full. Partial
-- payment (credit) still requires a customer. This recreates create_sale so a
-- null p_customer_id is only accepted when p_amount_paid covers the full total.
-- ============================================================================

create or replace function public.create_sale(
  p_shop_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_amount_paid numeric,
  p_payment_method text default 'cash'
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_cashier  uuid := auth.uid();
  v_item     jsonb;
  v_product  public.products;
  v_qty      integer;
  v_line     numeric(14, 2);
  v_subtotal numeric(14, 2) := 0;
  v_total    numeric(14, 2);
  v_receipt  text;
  v_sale_id  uuid;
begin
  if v_cashier is null then
    raise exception 'not_authenticated';
  end if;
  if not public.auth_is_super_admin() and p_shop_id is distinct from public.auth_shop_id() then
    raise exception 'shop_mismatch';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_items';
  end if;
  if p_amount_paid < 0 then
    raise exception 'negative_payment';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select p.* into v_product
      from public.products p
     where p.id = (v_item ->> 'product_id')::uuid
        and p.shop_id = p_shop_id
        and p.deleted_at is null
        and p.is_active
      for update;

    if not found then
      raise exception 'product_not_found';
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty <= 0 then
      raise exception 'invalid_quantity';
    end if;
    if v_qty > v_product.quantity then
      raise exception 'insufficient_stock';
    end if;

    v_line := v_product.selling_price * v_qty;
    v_subtotal := v_subtotal + v_line;
  end loop;

  v_total := v_subtotal;
  if p_amount_paid > v_total then
    raise exception 'overpayment';
  end if;

  -- Walk-in buyers (no customer) cannot be given credit: require full payment.
  if p_customer_id is null and p_amount_paid < v_total then
    raise exception 'customer_required';
  end if;

  v_receipt := 'RCP-' || to_char(now(), 'YYYYMMDD') || '-'
    || lpad(nextval('public.receipt_number_seq')::text, 6, '0');

  insert into public.sales (
    shop_id, customer_id, cashier_id, receipt_number,
    subtotal, total, amount_paid, payment_method, status
  )
  values (
    p_shop_id, p_customer_id, v_cashier, v_receipt,
    v_subtotal, v_total, p_amount_paid, p_payment_method, 'completed'
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select p.* into v_product
      from public.products p
     where p.id = (v_item ->> 'product_id')::uuid;

    v_qty := (v_item ->> 'quantity')::integer;
    v_line := v_product.selling_price * v_qty;

    insert into public.sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
    values (v_sale_id, v_product.id, v_product.name, v_qty, v_product.selling_price, v_line);

    update public.products
       set quantity = quantity - v_qty
     where id = v_product.id;

    insert into public.stock_history
      (shop_id, product_id, change_type, quantity_before, quantity_changed, quantity_after,
       reference_type, reference_id, created_by)
    values
      (p_shop_id, v_product.id, 'sale', v_product.quantity, -v_qty, v_product.quantity - v_qty,
       'sale', v_sale_id, v_cashier);
  end loop;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (p_shop_id, v_cashier, 'sale_created', 'sale', v_sale_id);

  return v_sale_id;
end $$;
