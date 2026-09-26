import { OrdersList } from "@/components/account/OrdersList";
import { SectionTitle } from "@/components/account/AccountShell";

export default function Page() {
  return (
    <section>
      <SectionTitle>Orders</SectionTitle>
      <OrdersList />
    </section>
  );
}
