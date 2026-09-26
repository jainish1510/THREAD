import { MeasurementsForm } from "@/components/account/MeasurementsForm";
import { catalog } from "@/lib/catalog";

export default function Page() {
  return <MeasurementsForm teeBlock={catalog.blocks["tee-regular"]!} jeanBlock={catalog.blocks["bottom-regular"]!} />;
}
