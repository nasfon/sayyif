import Box from '@mui/material/Box'

interface LogoProps {
  size?: number
}

export default function Logo({ size = 48 }: LogoProps) {
  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="#2563eb" />
      <path d="M24 11l12 7v14l-12 7-12-7V18l12-7z" fill="#ffffff" />
      <path d="M24 11l12 7-12 7-12-7 12-7z" fill="#dbeafe" />
      <path d="M36 18l-12 7v14l12-7V18z" fill="#bfdbfe" />
    </Box>
  )
}