// English comments only inside code:
// Profile placeholder. Hook it to your auth later.

export default function Profile() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <p className="mt-3 text-ink-soft">Manage your account and preferences.</p>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-ink">Account</h3>
          <div className="mt-3 space-y-3 text-sm">
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-ink-soft">Name</span>
              <input className="col-span-2 h-9 rounded-md border border-border px-3" defaultValue="Jane Doe" />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <span className="text-ink-soft">Email</span>
              <input className="col-span-2 h-9 rounded-md border border-border px-3" defaultValue="jane@example.com" />
            </div>
            <button className="mt-2 rounded-md bg-primary px-4 py-2 text-white hover:opacity-90">
              Save
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-ink">Security</h3>
          <p className="mt-2 text-sm text-ink-soft">Update your password and 2FA settings.</p>
          <button className="mt-4 rounded-md border border-border px-4 py-2 hover:border-primary">
            Change Password
          </button>
        </div>
      </section>
    </div>
  )
}
