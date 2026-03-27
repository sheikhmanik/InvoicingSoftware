export default function AddProduct() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Add a Product</h1>

      {/* Toggle */}
      <div className="flex gap-6 mb-8 bg-white p-4 border rounded-lg shadow-sm">
        <label className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900">
          <input type="radio" name="type" defaultChecked className="accent-sky-600" />
          <span className="font-medium">Fixed Recurring</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-gray-900">
          <input type="radio" name="type" className="accent-sky-600" />
          <span className="font-medium">Metered</span>
        </label>
      </div>

      {/* FIXED RECURRING FORM */}
      <div className="border rounded-lg p-6 bg-white shadow-md space-y-6">
        <h2 className="font-semibold text-lg text-gray-800">Fixed Price Settings</h2>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Name</label>
          <input
            className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
            placeholder="Product Name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Description</label>
          <textarea
            className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
            rows={2}
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Price</label>
          <input
            className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
            placeholder="500"
          />
        </div>
      </div>

      {/* METERED FORM */}
      <div className="border rounded-lg p-6 bg-white shadow-md space-y-6 mt-10">
        <h2 className="font-semibold text-lg text-gray-800">Metered Settings</h2>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Name</label>
          <input
            className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Description</label>
          <textarea
            className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
            rows={2}
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">
            Per Unit (Per Order / Per Month / Msg)
          </label>
          <input
            className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
            placeholder="1"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Message</label>
            <input
              className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
              placeholder="1 msg"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1 text-gray-700">Credits</label>
            <input
              className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
              placeholder="2 credits"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">Minimum Credits</label>
          <input
            className="border rounded w-full px-3 py-2 focus:ring-2 focus:ring-sky-300 focus:outline-none"
            placeholder="500 credits"
          />
        </div>
      </div>
    </div>
  );
}