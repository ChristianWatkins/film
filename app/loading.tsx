export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading films...</h2>
      </div>
    </div>
  );
}

