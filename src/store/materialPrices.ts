import { RawMaterialPrices } from "../types";

export function deriveMaterialPricesFromPackaging(
  packaging: Record<string, { price: number; volume: number }>
): RawMaterialPrices {
  const perMl = (key: string) =>
    packaging[key].price / (packaging[key].volume || 1);

  return {
    shampooProscenia: perMl("shampooProscenia"),
    lotionAcPretreatment: perMl("lotionAcPretreatment"),
    laminatingGel: perMl("laminatingGel"),
    maskProscenia: perMl("maskProscenia"),
    shampooProeditCurlFit: perMl("shampooProeditCurlFit"),
    basePliaBase: perMl("basePliaBase"),
    lotionPliaStep1: perMl("lotionPliaStep1"),
    lotionPliaStep2: perMl("lotionPliaStep2"),
    conditionerPearl: perMl("conditionerPearl"),
    serumAfterPerm: perMl("serumAfterPerm"),
  };
}
