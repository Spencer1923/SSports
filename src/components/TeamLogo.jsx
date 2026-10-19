import Image from "next/image";

// a team logo that next/image shrinks to the size you ask for (ESPN's originals are 500px)
// `size` = the pixel size it's shown at; className still controls the real layout size
export default function TeamLogo({ src, alt = "", size = 24, className = "" }) {
  if (!src) return null;
  return <Image src={src} alt={alt} width={size} height={size} className={className} />;
}