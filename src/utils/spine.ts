export function hueFromTitle(title: string) {
  let hue = 0
  for (const character of title) hue = (hue * 31 + character.charCodeAt(0)) % 360
  return hue
}

export function spineGradient(hue: number) {
  return `linear-gradient(150deg, hsl(${hue} 34% 40%), hsl(${(hue + 28) % 360} 30% 26%))`
}
