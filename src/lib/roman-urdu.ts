/**
 * The same answers, in the words customers actually use.
 *
 * Roman Urdu rather than Urdu script, deliberately. This is for the customer
 * who types "mandi bahauddin sona rate" or "purana sona kaha bechen" into a
 * phone — which in Punjab is most of them — and that is typed in Latin letters.
 * Urdu script is a separate job: it needs its own `lang`, right-to-left layout
 * and a font that carries nastaliq properly, and doing it badly would read
 * worse than not doing it.
 *
 * Nothing here is new. Every answer restates something the site already says in
 * English on the page it sits under, or in the FAQ those pages share. When a
 * figure or a policy changes, change it at its source and here — the same rule
 * faq.ts keeps.
 */

export type UrduAnswer = { q: string; a: string };
export type UrduAnswers = { title: string; items: UrduAnswer[] };

/** Under the rate board. Mirrors the pricing topic of the FAQ. */
export const RATE_ANSWERS: UrduAnswers = {
  title: "Aaj ka rate — aam sawalat",
  items: [
    {
      q: "Mandi Bahauddin mein aaj sone ka rate kya hai?",
      a: "Ooper board par aaj ka rate mojood hai: 24K (Piece), 23.65K (Pathor) aur 22K (Jewellery) sona, aur chandi. Har rate tole aur gram dono ke hisab se likha hai, aur saath waqt bhi likha hai ke aakhri baar kab update hua.",
    },
    {
      q: "Ek tole mein kitne gram hote hain?",
      a: "Ek tola 11.6638 gram ka hota hai. Rate tole ke hisab se likha jata hai kyunke bazar mein sona isi tarah bikta hai, aur saath gram bhi diya hota hai.",
    },
    {
      q: "Sone ki qeemat roz kyun badalti hai?",
      a: "Sirf sone ka rate badalta hai. Banwai aur nagon ki qeemat rupay mein tay hoti hai aur wohi rehti hai — kaam is liye mehnga nahi hota ke us subah sona ooper chala gaya.",
    },
    {
      q: "Zewar ki qeemat kaise banti hai?",
      a: "Sone ki qeemat, banwai, aur nagon ki qeemat — teenon mila kar. Sona us din ke rate par, us ke apne karat ke hisab se. Har product page par ye alag alag likha hota hai, aur aakhri qeemat counter par usi din confirm hoti hai.",
    },
  ],
};

/** Under the selling page. Mirrors the selling topic of the FAQ. */
export const SELL_ANSWERS: UrduAnswers = {
  title: "Sona bechna — aam sawalat",
  items: [
    {
      q: "Aap mera sona kis rate par khareedte hain?",
      a: "Hum zewar 20K rate par khareedte hain. Wo rate isi page par likha hota hai aur har roz bazar ke saath badalta hai. Aap ko wohi rate aap ke zewar ke wazan par diya jata hai, aur wazan aap ke saamne hota hai.",
    },
    {
      q: "Mujhe apne saath kya laana hoga?",
      a: "Apna CNIC. CNIC ke baghair hum sona nahi khareed sakte, zewar chahe koi bhi ho. Purana bill zaroori nahi, lekin ho to waqt bach jata hai kyunke us par wazan aur karat pehle se likha hota hai.",
    },
    {
      q: "Kya main doosri dukaan ka sona bech sakta hoon?",
      a: "Ji haan. Kisi aur sunar ka khareeda hua sona, wirasat mein mila zewar, ya purana aur toota hua sona — sab ka aik hi tarika hai: purity ka test aur wazan, dono aap ke saamne, phir us din ke buying rate par qeemat.",
    },
    {
      q: "Paise kis tarah miltay hain?",
      a: "Counter par cash, aap ke account mein bank transfer, ya naye zewar ke badle exchange. Qeemat tay hone ke baad aap khud chun lein.",
    },
    {
      q: "Agar qeemat pasand na aaye to?",
      a: "Koi baat nahi — bechna zaroori nahi hai. Agar rate aap ko theek na lagay to aap ka sona aap ke saath wapas jata hai.",
    },
  ],
};

/** Under the hallmarking page. Mirrors the purity topic of the FAQ. */
export const PURITY_ANSWERS: UrduAnswers = {
  title: "Khara sona — aam sawalat",
  items: [
    {
      q: "Aap ka zewar kitne karat ka hota hai?",
      a: "Sone ka zewar 22K par stamp hota hai, aur heere waale kaam mein 18K. Chandi 925 par. Stamp zewar par khud laga hota hai, sirf bill par nahi.",
    },
    {
      q: "Kya zewar mere saamne tola jata hai?",
      a: "Ji haan. Bill banne se pehle har zewar counter par calibrated scale par tola jata hai, aur gross wazan, saaf sone ka wazan aur nagon ka wazan teenon likhe jate hain. Jo zewar delivery par jata hai, wo video mein tol kar bheja jata hai.",
    },
    {
      q: "Kya aap apna becha hua zewar wapas khareedte hain?",
      a: "Ji haan, jab tak hamari dukaan chal rahi hai. Zewar aur us ka bill le kar aayein. Rate us din ka lagta hai jis din aap wapas laayein, us din ka nahi jis din aap ne khareeda tha. Banwai wapas nahi hoti — ye poore bazar ka usool hai.",
    },
  ],
};
