import { WishlistView } from "@/components/account/WishlistView";
import { toCard } from "@/components/product/toCard";
import { getProducts } from "@/lib/catalog";

export default function Page() {
  return <WishlistView cards={getProducts().map(toCard)} />;
}
