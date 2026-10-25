/**
 * Dean Edwards P.A.C.K.E.R. Unpacker in Pure JavaScript
 * Decodes obfuscated `eval(function(p,a,c,k,e,d)...)` code
 */

class JsPacker {
  static detect(html) {
    return /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[dr]\s*\)/i.test(html);
  }

  static unpack(source) {
    if (!source) return '';
    const match = source.match(/}\s*\('(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s);
    if (!match) return source;

    try {
      const payload = match[1].replace(/\\'/g, "'");
      const radix = parseInt(match[2], 10);
      const count = parseInt(match[3], 10);
      const symtab = match[4].split('|');

      if (symtab.length !== count) {
        return source;
      }

      const unbase = (val, base) => {
        const selector = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (base <= 36) {
          return parseInt(val, base);
        }
        let res = 0;
        for (let i = 0; i < val.length; i++) {
          const index = selector.indexOf(val[i]);
          if (index < 0) return 0;
          res = res * base + index;
        }
        return res;
      };

      const wordRegex = /\b[a-zA-Z0-9_]+\b/g;
      return payload.replace(wordRegex, (word) => {
        const index = unbase(word, radix);
        if (index < symtab.length && symtab[index]) {
          return symtab[index];
        }
        return word;
      });
    } catch {
      return source;
    }
  }
}

module.exports = JsPacker;
