/**
 * The studio's own presenter: a flat illustration in the brand palette,
 * drawn in SVG so it scales cleanly and animates in parts.
 * Animated from Intro.tsx: [data-arm] rises into the presenting pose,
 * [data-head] tilts, [data-eyes] blink.
 */
export default function Presenter({ className = "" }: { className?: string }) {
  const skin = "#d9a07c";
  const skinShade = "#c4896a";
  const hair = "#1c1633";
  const suit = "#0a1733";
  const suitLight = "#16295c";
  return (
    <svg viewBox="0 0 440 1000" className={className} role="img" aria-label="Illustrated presenter welcoming visitors to the studio">
      {/* floor shadow */}
      <ellipse cx="200" cy="958" rx="150" ry="16" fill="#0a1733" opacity="0.14" />

      {/* back hair */}
      <path d="M128 140 C118 230 112 300 126 360 L262 352 C270 300 262 220 252 140 Z" fill={hair} />

      {/* legs */}
      <path d="M142 570 L150 930 L184 930 L196 580 L196 570 Z" fill={suit} />
      <path d="M196 570 L196 580 L212 930 L246 930 L256 570 Z" fill={suitLight} />
      {/* shoes */}
      <path d="M144 928 h44 q10 0 10 12 v6 h-64 q0 -18 10 -18z" fill="#0b0b14" />
      <path d="M208 928 h44 q14 2 18 18 h-66 v-6 q0 -12 4 -12z" fill="#0b0b14" />

      {/* left arm (hand on hip) */}
      <path d="M134 268 C112 330 102 392 112 432 C122 470 146 492 168 500" stroke={suit} strokeWidth="40" strokeLinecap="round" fill="none" />
      <circle cx="170" cy="500" r="15" fill={skin} />

      {/* torso / blazer */}
      <path d="M128 256 C160 238 232 238 262 256 L258 420 C256 470 262 520 268 586 L124 586 C130 520 136 470 134 420 Z" fill={suitLight} />
      {/* blouse */}
      <path d="M172 244 L216 244 L194 340 Z" fill="#f4f7ff" />
      {/* lapels */}
      <path d="M168 246 L194 340 L150 300 L158 254 Z" fill={suit} />
      <path d="M220 246 L194 340 L240 300 L232 254 Z" fill={suit} />
      {/* button and waist seam */}
      <circle cx="196" cy="420" r="6" fill="#ffd166" />
      <path d="M140 470 Q196 480 254 470" stroke={suit} strokeWidth="3" fill="none" opacity="0.6" />
      {/* studio pin: the ring mark */}
      <circle cx="236" cy="300" r="9" fill="none" stroke="#2bb8ff" strokeWidth="3.5" />
      <circle cx="236" cy="300" r="3" fill="#ffd166" />

      {/* neck */}
      <path d="M180 196 h28 v52 q-14 10 -28 0z" fill={skinShade} />

      {/* head */}
      <g data-head style={{ transformOrigin: "194px 210px", transformBox: "view-box" }}>
        <ellipse cx="194" cy="150" rx="46" ry="56" fill={skin} />
        {/* ear */}
        <ellipse cx="150" cy="156" rx="7" ry="12" fill={skinShade} />
        {/* front hair with side part */}
        <path d="M146 150 C140 96 176 80 204 86 C236 92 250 120 244 160 C230 128 206 112 176 118 C162 124 152 136 146 150 Z" fill={hair} />
        <path d="M240 150 C250 200 252 250 246 300 L262 300 C266 240 260 180 246 132 Z" fill={hair} />
        {/* brows */}
        <path d="M168 134 q10 -6 20 -1" stroke={hair} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M204 133 q10 -5 20 1" stroke={hair} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        {/* eyes */}
        <g data-eyes style={{ transformOrigin: "196px 150px", transformBox: "view-box" }}>
          <ellipse cx="178" cy="150" rx="4.5" ry="5.5" fill="#15122a" />
          <ellipse cx="214" cy="150" rx="4.5" ry="5.5" fill="#15122a" />
        </g>
        {/* nose and smile */}
        <path d="M197 156 q-4 14 2 18" stroke={skinShade} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M178 182 q18 14 36 0" stroke="#9b3f3f" strokeWidth="4" strokeLinecap="round" fill="none" />
        <ellipse cx="166" cy="172" rx="8" ry="5" fill="#e8807a" opacity="0.35" />
        <ellipse cx="226" cy="172" rx="8" ry="5" fill="#e8807a" opacity="0.35" />
      </g>

      {/* presenting arm: rotates up from the shoulder */}
      <g data-arm style={{ transformOrigin: "252px 268px", transformBox: "view-box" }}>
        <path d="M252 268 L296 386" stroke={suitLight} strokeWidth="40" strokeLinecap="round" />
        <path d="M296 386 L382 334" stroke={suitLight} strokeWidth="36" strokeLinecap="round" />
        {/* cuff */}
        <path d="M372 322 L392 352" stroke="#f4f7ff" strokeWidth="10" strokeLinecap="round" />
        {/* open palm, facing up */}
        <path d="M392 334 C404 322 424 318 436 322 C440 326 436 332 428 333 L436 336 C440 340 434 346 424 345 C412 346 400 346 392 344 Z" fill={skin} />
        <path d="M398 326 C404 318 412 312 418 312 C422 314 420 320 412 324" fill={skinShade} />
      </g>
    </svg>
  );
}
