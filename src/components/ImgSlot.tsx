interface ImgSlotProps {
  placeholder: string;
  dark?: boolean;
}

/**
 * Placeholder for a species / recipe / knot image. Real photos will be dropped
 * into /public/assets under a free licence (Wikimedia Commons — CC0/CC-BY/BY-SA)
 * with credit stored per image; this component then swaps to an <img>.
 */
export function ImgSlot({ placeholder, dark }: ImgSlotProps) {
  return <div className={"img-slot" + (dark ? " dark" : "")}>{placeholder}</div>;
}
