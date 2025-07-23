type CartItem = {
  menuItem: {
    name: string;
    price: number;
  };
  quantity: number;
  price?: number;
};

type Props = {
  items: CartItem[];
  addToCart?: (item: CartItem) => void;
};

export function POS({ items, addToCart }: Props) {
  const handleAddSampleItem = () => {
    if (addToCart) {
      addToCart({
        menuItem: {
          name: 'Burger',
          price: 150,
        },
        quantity: 1,
      });
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Point of Sale</h2>
        {addToCart && (
          <button
            onClick={handleAddSampleItem}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Add Burger
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-2 border-b">#</th>
              <th className="text-left px-4 py-2 border-b">Item</th>
              <th className="text-left px-4 py-2 border-b">Qty</th>
              <th className="text-left px-4 py-2 border-b">Price</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  No items in cart
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const unitPrice = item.price ?? item.menuItem.price;
                const total = unitPrice * item.quantity;

                return (
                  <tr key={index}>
                    <td className="px-4 py-2 border-b">{index + 1}</td>
                    <td className="px-4 py-2 border-b">{item.menuItem.name}</td>
                    <td className="px-4 py-2 border-b">{item.quantity}</td>
                    <td className="px-4 py-2 border-b">₹{total.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
