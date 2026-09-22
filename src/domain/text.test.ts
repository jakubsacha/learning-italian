import { describe, expect, it } from "vitest";
import { acceptedForms, editDistance, judgeTyped, plural, splitGap } from "./text";

describe("luka w zdaniu", () => {
  it("działa dla słów z akcentem, gdzie \\b zawodzi", () => {
    expect(splitGap("Mi piace molto questa città.", "città")).toEqual({
      before: "Mi piace molto questa ", after: ".",
    });
    expect(splitGap("Un caffè, per favore.", "caffè")).toEqual({
      before: "Un ", after: ", per favore.",
    });
  });

  it("nie zwraca uwagi na wielkość liter", () => {
    expect(splitGap("Purtroppo non posso.", "purtroppo")).toEqual({ before: "", after: " non posso." });
  });

  it("gdy luki nie ma, oddaje zdanie w całości", () => {
    expect(splitGap("Ciao a tutti.", "xyz")).toEqual({ before: "Ciao a tutti.", after: "" });
  });
});

describe("uznawane odpowiedzi", () => {
  it("rozdziela warianty po ukośniku", () => {
    expect(acceptedForms("scusi / scusa")).toEqual(["scusi", "scusa"]);
  });

  it("przyjmuje formę z nawiasem i bez", () => {
    const forms = acceptedForms("piacere (mi piace)");
    expect(forms).toContain("piacere (mi piace)");
    expect(forms).toContain("piacere");
    expect(forms).toContain("mi piace");
  });

  it("proste słowo daje jedną formę", () => {
    expect(acceptedForms("grazie")).toEqual(["grazie"]);
  });
});

describe("ocena wpisanej odpowiedzi", () => {
  const forms = acceptedForms("perché");

  it("trafienie liczy się nawet bez akcentu", () => {
    expect(judgeTyped("perché", forms)).toBe("exact");
    expect(judgeTyped("perche", forms)).toBe("exact");
    expect(judgeTyped("  PERCHÉ ", forms)).toBe("exact");
  });

  it("literówka to nie to samo co błąd", () => {
    expect(judgeTyped("percha", forms)).toBe("typo");
    expect(judgeTyped("zupełnie inne", forms)).toBe("wrong");
  });

  it("puste pole to błąd, nie trafienie", () => {
    expect(judgeTyped("   ", forms)).toBe("wrong");
  });

  it("dłuższe słowa mają większą tolerancję", () => {
    const long = acceptedForms("appuntamento");
    expect(judgeTyped("apuntamento", long)).toBe("typo");
    expect(judgeTyped("apuntamenta", long)).toBe("typo");
    expect(judgeTyped("appartamento x", long)).toBe("wrong");
  });

  it("dowolny z wariantów po ukośniku wystarczy", () => {
    const both = acceptedForms("scusi / scusa");
    expect(judgeTyped("scusa", both)).toBe("exact");
    expect(judgeTyped("scusi", both)).toBe("exact");
  });
});

describe("odległość edycyjna", () => {
  it("liczy pojedyncze operacje", () => {
    expect(editDistance("kot", "kot")).toBe(0);
    expect(editDistance("kot", "kota")).toBe(1);
    expect(editDistance("kot", "pot")).toBe(1);
    expect(editDistance("", "abc")).toBe(3);
  });
});

describe("polska odmiana", () => {
  it("odmienia karty", () => {
    const form = (n: number) => `${n} ${plural(n, "karta", "karty", "kart")}`;
    expect([1, 2, 3, 5, 12, 14, 22, 25].map(form)).toEqual([
      "1 karta", "2 karty", "3 karty", "5 kart", "12 kart", "14 kart", "22 karty", "25 kart",
    ]);
  });

  it("odmienia dni", () => {
    const form = (n: number) => `${n} ${plural(n, "dzień", "dni", "dni")}`;
    expect([0, 1, 2, 5].map(form)).toEqual(["0 dni", "1 dzień", "2 dni", "5 dni"]);
  });
});
