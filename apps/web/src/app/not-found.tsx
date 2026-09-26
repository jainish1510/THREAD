import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <div className="container-x">
      <EmptyState title="We couldn't find that page." body="It may have moved, or never existed." action={{ href: "/shop", label: "Explore collection" }} />
    </div>
  );
}
