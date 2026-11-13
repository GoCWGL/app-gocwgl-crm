// Countries for pickers (resume › education). English names come from the browser's own Intl data, so only
// the ISO 3166-1 codes live here. Where most GoCWGL VAs and clients are come first.

const COMMON = ["PH", "IN", "PK", "ID", "VN", "CO", "MX", "KE", "NG", "ZA", "US", "GB", "CA", "AU"];

const ALL =
  "AF AX AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR VG BN BG BF BI KH CM CA CV KY CF TD CL CN " +
  "CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN " +
  "GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ " +
  "MR MU MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW WS SM " +
  "ST SA SN RS SC SL SG SX SK SI SB SO ZA KR SS ES LK KN LC VC SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TC TV UG UA AE GB US " +
  "UY UZ VU VA VE VN YE ZM ZW";

const names = new Intl.DisplayNames(["en"], { type: "region" });
const nameOf = (code: string) => names.of(code) ?? code;

const rest = ALL.split(" ")
  .filter((c) => c && !COMMON.includes(c))
  .map(nameOf)
  .sort((a, b) => a.localeCompare(b));

/** Country names: the common ones first, then A–Z. */
export const COUNTRIES: string[] = [...COMMON.map(nameOf), ...rest];

/** "Davao, Philippines" / "philippines" → "Philippines" (one of COUNTRIES), or "" when it isn't one. */
export function countryFrom(location: string | null | undefined): string {
  const parts = (location ?? "").split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  for (const part of parts.reverse()) {
    const hit = COUNTRIES.find((c) => c.toLowerCase() === part);
    if (hit) return hit;
  }
  return "";
}
