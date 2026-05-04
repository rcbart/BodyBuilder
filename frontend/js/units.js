// ─── Unit Conversion Utilities ────────────────────────────────────────────────

function kgToLbs(kg)       { return Math.round(+kg * 22.0462) / 10; }          // 1 decimal
function lbsToKg(lbs)      { return Math.round(+lbs / 2.20462 * 100) / 100; }  // 2 decimals
function cmToFtIn(cm)      {
  const totalIn = +cm / 2.54;
  return { ft: Math.floor(totalIn / 12), inches: Math.round(totalIn % 12) };
}
function ftInToCm(ft, inches) { return Math.round((+ft * 12 + +inches) * 2.54 * 10) / 10; }
function gToOz(g)          { return Math.round(+g * 0.035274 * 100) / 100; }
function ozToG(oz)         { return Math.round(+oz / 0.035274 * 10) / 10; }

// Label helpers
function wtLabel(units)    { return units === "imperial" ? "lbs" : "kg"; }
function wgLabel(units)    { return units === "imperial" ? "oz" : "g"; }
function htLabel(units)    { return units === "imperial" ? "ft / in" : "cm"; }

// Value helpers — always store metric, convert for display
function wtDisplay(kg, units)    { return units === "imperial" ? kgToLbs(kg)  : +kg; }
function wtToKg(val, units)      { return units === "imperial" ? lbsToKg(val) : +val; }
function wgDisplay(g,  units)    { return units === "imperial" ? gToOz(g)     : +g; }
function wgToG(val, units)       { return units === "imperial" ? ozToG(val)   : +val; }
