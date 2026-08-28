import Box from '@mui/material/Box'
import logo from '../../assets/logo.png'

interface LogoProps {
  size?: number
}

export default function Logo({ size = 48 }: LogoProps) {
  return (
    <Box
      component="img"
      src={logo}
      alt="SAYYIF PREMIUM FLOUR MASTERS LTD"
      width={size}
      height={size}
      sx={{ objectFit: 'contain', display: 'block' }}
    />
  )
}