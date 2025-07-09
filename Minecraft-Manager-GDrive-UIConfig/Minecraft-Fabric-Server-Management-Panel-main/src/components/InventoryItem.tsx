import React from 'react';

type InventoryItemProps = {
  item: string;
  count: number;
  slot: number;
};

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, count, slot }) => {
  const itemName = item.replace('minecraft:', '');
  const imageSrc = `/items/${itemName}.png`;

  return (
    <div className="flex flex-col items-center justify-center p-2 w-24 border rounded shadow bg-white">
      <div className="relative">
        <img src={imageSrc} alt={itemName} className="w-16 h-16" />
        <span className="absolute bottom-0 right-0 text-xs font-bold text-white bg-black bg-opacity-60 px-1 rounded">
          {count}
        </span>
      </div>
      <div className="text-xs mt-1 text-center">{itemName}</div>
      <div className="text-[10px] text-gray-500">Slot: {slot}</div>
    </div>
  );
};
