// app/src/lib/countries.ts
// Países que se ofrecen en el perfil. El país decide la notoriedad (MOTOR §2b.4), los títulos y el formato del teléfono.
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'ES', name: 'España' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
]

export function countryName(code?: string): string | undefined {
  return COUNTRIES.find((c) => c.code === code)?.name
}

