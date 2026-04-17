'use client';

import { useState } from 'react';

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer' | 'billing';
  joined_at: string;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

const DEMO_TEAMS: Team[] = [
  {
    id: '1',
    name: 'Engineering',
    members: [
      { id: '1', email: 'alice@company.com', role: 'owner', joined_at: new Date(Date.now() - 86400000 * 30).toISOString() },
      { id: '2', email: 'bob@company.com', role: 'developer', joined_at: new Date(Date.now() - 86400000 * 20).toISOString() },
      { id: '3', email: 'charlie@company.com', role: 'admin', joined_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    ],
  },
  {
    id: '2',
    name: 'Data Science',
    members: [
      { id: '4', email: 'diana@company.com', role: 'admin', joined_at: new Date(Date.now() - 86400000 * 15).toISOString() },
      { id: '5', email: 'eve@company.com', role: 'viewer', joined_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    ],
  },
];

const ROLES = ['owner', 'admin', 'developer', 'viewer', 'billing'] as const;

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(DEMO_TEAMS);
  const [selectedTeam, setSelectedTeam] = useState<Team>(DEMO_TEAMS[0]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', role: 'developer' as TeamMember['role'] });

  const handleAddMember = () => {
    if (!newMember.email) return;
    const member: TeamMember = {
      id: Date.now().toString(),
      email: newMember.email,
      role: newMember.role,
      joined_at: new Date().toISOString(),
    };
    setTeams(t => t.map(team =>
      team.id === selectedTeam.id ? { ...team, members: [...team.members, member] } : team
    ));
    setSelectedTeam(team => ({ ...team, members: [...team.members, member] }));
    setShowAddMember(false);
    setNewMember({ email: '', role: 'developer' });
  };

  const changeRole = (memberId: string, newRole: TeamMember['role']) => {
    const updated = teams.map(t => {
      if (t.id === selectedTeam.id) {
        return { ...t, members: t.members.map(m => m.id === memberId ? { ...m, role: newRole } : m) };
      }
      return t;
    });
    setTeams(updated);
    setSelectedTeam(updated.find(t => t.id === selectedTeam.id)!);
  };

  const removeMember = (memberId: string) => {
    const updated = teams.map(t => {
      if (t.id === selectedTeam.id) {
        return { ...t, members: t.members.filter(m => m.id !== memberId) };
      }
      return t;
    });
    setTeams(updated);
    setSelectedTeam(updated.find(t => t.id === selectedTeam.id)!);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Teams</h2>
          <p className="text-slate-600 mt-2">Manage team members and permissions</p>
        </div>
        <span className="bg-brand-100 text-brand-700 px-4 py-2 rounded-full text-sm font-medium">Demo Mode</span>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <div className="card">
            <h3 className="font-semibold mb-4">Your Teams</h3>
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedTeam.id === team.id ? 'bg-brand-100 text-brand-700' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="font-medium">{team.name}</div>
                  <div className="text-xs text-slate-500">{team.members.length} members</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{selectedTeam.name} Members</h3>
              <button onClick={() => setShowAddMember(true)} className="btn-primary text-sm">+ Add Member</button>
            </div>

            {showAddMember && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="member@company.com"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={newMember.role}
                      onChange={(e) => setNewMember({ ...newMember, role: e.target.value as TeamMember['role'] })}
                      className="w-full"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={handleAddMember} className="btn-primary text-sm">Add Member</button>
                  <button onClick={() => setShowAddMember(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedTeam.members.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member.id, e.target.value as TeamMember['role'])}
                        className="text-sm"
                        disabled={member.role === 'owner'}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {member.role !== 'owner' && (
                        <button onClick={() => removeMember(member.id)} className="text-red-600 hover:text-red-800 text-sm">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
