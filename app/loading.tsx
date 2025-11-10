export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Loading films...</h2>
      </div>
    </div>
  );
}

