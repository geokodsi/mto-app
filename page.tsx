export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2">Overview</h1>
      <p className="text-gray-500 mb-8">Welcome to RecruitAI</p>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Screenings this week', value: '0' },
          { label: 'Pass rate', value: '0%' },
          { label: 'Interviews booked', value: '0' },
          { label: 'Active jobs', value: '0' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border rounded-xl p-5">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-base font-medium mb-4">Recent candidates</h2>
        <p className="text-sm text-gray-400">No screenings yet. Create a job to get started.</p>
      </div>
    </div>
  )
}