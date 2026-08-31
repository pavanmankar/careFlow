function KpiChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5 shadow-sm">
      <div className="text-[5px] text-slate-400">{label}</div>
      <div className="text-[8px] font-semibold text-navy-900">{value}</div>
    </div>
  );
}

function MiniBars() {
  const heights = [28, 40, 22, 48, 34, 52, 30];
  return (
    <div className="flex h-14 items-end gap-1 rounded-md bg-white px-2 py-1.5">
      {heights.map((height, index) => (
        <div
          key={index}
          className="w-2 rounded-sm bg-brand-500/80"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function FakeDashScreen({ className = '' }: { className?: string }) {
  return (
    <div className={`h-full w-full overflow-hidden bg-[#F8F9FA] p-2 ${className}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="h-2 w-16 rounded-full bg-brand-500/70" />
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-brand-200" />
        </div>
      </div>
      <div className="mb-1.5 grid grid-cols-3 gap-1">
        <KpiChip label="Patients" value="1,248" />
        <KpiChip label="Visits" value="86" />
        <KpiChip label="Staff" value="24" />
      </div>
      <MiniBars />
      <div className="mt-1.5 space-y-1">
        {['James Carter', 'Priya Nair', 'Elena Popov'].map((name) => (
          <div key={name} className="flex items-center gap-1.5 rounded bg-white px-1.5 py-1">
            <span className="h-3 w-3 rounded-full bg-brand-200" />
            <span className="text-[6px] text-slate-600">{name}</span>
            <span className="ml-auto h-1.5 w-8 rounded-full bg-mint" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FakePhoneScreen() {
  return (
    <div className="h-full w-full bg-white p-2">
      <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-slate-200" />
      <div className="mb-2 text-[7px] font-semibold text-navy-900">Today</div>
      {[
        { t: '09:30', n: 'Aisha R.' },
        { t: '10:15', n: 'Daniel B.' },
        { t: '11:00', n: 'Priya N.' },
      ].map((row) => (
        <div key={row.t} className="mb-1.5 rounded-lg bg-mint px-2 py-1.5">
          <div className="text-[6px] font-medium text-navy-900">{row.n}</div>
          <div className="text-[5px] text-brand-700">{row.t} consult</div>
        </div>
      ))}
    </div>
  );
}

export function LaptopPhoneMock() {
  return (
    <div className="relative mx-auto mt-8 h-[280px] w-full max-w-[420px]">
      <div className="absolute left-0 top-0 w-[78%]">
        <div className="rounded-t-xl bg-[#2C3A4A] p-1.5 shadow-xl">
          <div className="overflow-hidden rounded-lg">
            <div className="h-[168px]">
              <FakeDashScreen />
            </div>
          </div>
        </div>
        <div className="h-2 bg-[#1F2A38]" />
        <div className="mx-auto h-2 w-[88%] rounded-b-md bg-[#4A5563]" />
        <div className="mx-auto h-1.5 w-[40%] rounded-b-full bg-[#2C3A4A]" />
      </div>
      <div className="absolute bottom-2 right-2 w-[118px] rounded-[22px] bg-[#1F2A38] p-1.5 shadow-2xl">
        <div className="overflow-hidden rounded-[16px]">
          <div className="h-[196px]">
            <FakePhoneScreen />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonitorMock() {
  return (
    <div className="mx-auto mt-8 w-full max-w-[420px]">
      <div className="rounded-2xl bg-[#2C3A4A] p-2 shadow-xl">
        <div className="overflow-hidden rounded-xl">
          <div className="h-[200px]">
            <FakeDashScreen />
          </div>
        </div>
      </div>
      <div className="mx-auto h-6 w-4 bg-[#4A5563]" />
      <div className="mx-auto h-2 w-28 rounded-full bg-[#2C3A4A]" />
    </div>
  );
}
