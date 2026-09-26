import Link from "next/link";

// simple breadcrumb trail — pass an array of { label, href } (last item has no href)
export default function Breadcrumbs({ items }) {
  return (
    <nav className="text-sm text-gray-400 mb-4">
      {items.map((item, i) => (
        <span key={i}>
          {item.href ? (
            <Link href={item.href} className="hover:text-[#D4AF37]">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-200">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="mx-2">›</span>}
        </span>
      ))}
    </nav>
  );
}