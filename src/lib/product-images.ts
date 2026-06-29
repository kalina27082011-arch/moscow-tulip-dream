import mayya from "@/assets/tulips-mayya.jpg";
import serenada from "@/assets/tulips-serenada.jpg";
import zamoskvorechye from "@/assets/tulips-zamoskvorechye.jpg";
import noche from "@/assets/tulips-noche.jpg";
import solntse from "@/assets/tulips-solntse.jpg";
import vesna from "@/assets/tulips-vesna.jpg";
import utro from "@/assets/tulips-utro.jpg";
import pervoeSvidanie from "@/assets/tulips-pervoe-svidanie.jpg";
import balerina from "@/assets/tulips-balerina.jpg";
import granat from "@/assets/tulips-granat.jpg";
import limonad from "@/assets/tulips-limonad.jpg";
import akvarel from "@/assets/tulips-akvarel.jpg";
import karamel from "@/assets/tulips-karamel.jpg";
import siren from "@/assets/tulips-siren.jpg";
import kapuchino from "@/assets/tulips-kapuchino.jpg";
import pionTyulpan from "@/assets/tulips-pion-tyulpan.jpg";
import oblako from "@/assets/tulips-oblako.jpg";
import zakat from "@/assets/tulips-zakat.jpg";
import sadPoeta from "@/assets/tulips-sad-poeta.jpg";

const map: Record<string, string> = {
  "tulips-mayya.jpg": mayya,
  "tulips-serenada.jpg": serenada,
  "tulips-zamoskvorechye.jpg": zamoskvorechye,
  "tulips-noche.jpg": noche,
  "tulips-solntse.jpg": solntse,
  "tulips-vesna.jpg": vesna,
  "tulips-utro.jpg": utro,
  "tulips-pervoe-svidanie.jpg": pervoeSvidanie,
  "tulips-balerina.jpg": balerina,
  "tulips-granat.jpg": granat,
  "tulips-limonad.jpg": limonad,
  "tulips-akvarel.jpg": akvarel,
  "tulips-karamel.jpg": karamel,
  "tulips-siren.jpg": siren,
  "tulips-kapuchino.jpg": kapuchino,
  "tulips-pion-tyulpan.jpg": pionTyulpan,
  "tulips-oblako.jpg": oblako,
  "tulips-zakat.jpg": zakat,
  "tulips-sad-poeta.jpg": sadPoeta,
};

export function resolveProductImage(image_url: string | null | undefined): string {
  if (!image_url) return utro;
  if (image_url.startsWith("http://") || image_url.startsWith("https://")) return image_url;
  return map[image_url] ?? utro;
}