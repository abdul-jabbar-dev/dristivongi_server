const { z } = require("zod");
const s = z.string().nullable();
console.log(s.safeParse(""));
console.log(s.safeParse(undefined));
console.log(s.safeParse(null));
