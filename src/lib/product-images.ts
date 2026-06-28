import mayya from "@/assets/tulips-mayya.jpg";
import serenada from "@/assets/tulips-serenada.jpg";
import zamoskvorechye from "@/assets/tulips-zamoskvorechye.jpg";
import noche from "@/assets/tulips-noche.jpg";
import solntse from "@/assets/tulips-solntse.jpg";
import vesna from "@/assets/tulips-vesna.jpg";
import utro from "@/assets/tulips-utro.jpg";

const map: Record<string, string> = {
  "tulips-mayya.jpg": mayya,
  "tulips-serenada.jpg": serenada,
  "tulips-zamoskvorechye.jpg": zamoskvorechye,
  "tulips-noche.jpg": noche,
  "tulips-solntse.jpg": solntse,
  "tulips-vesna.jpg": vesna,
  "tulips-utro.jpg": utro,
};

export function resolveProductImage(image_url: string | null | undefined): string {
  if (!image_url) return utro;
  if (image_url.startsWith("http://") || image_url.startsWith("https://")) return image_url;
  return map[image_url] ?? utro;
}