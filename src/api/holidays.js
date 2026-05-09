export const getHolidays = async (year, countryCode) => {
  const res = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
  )
  const data = await res.json()
  return data.map((h) => new Date(h.date + 'T00:00:00'))
}
