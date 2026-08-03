'use client';

import Image from 'next/image';
import { minecraftAvatarUrl } from '@/lib/avatar';
import type { CoopMember, SkyBlockProfile } from '@/lib/profileViewModel';

interface ProfileContextControlsProps {
  profiles: SkyBlockProfile[];
  activeProfileName: string | null;
  members: CoopMember[];
  viewingUuid: string | null;
  loading: boolean;
  onSelectProfile: (profile: SkyBlockProfile) => void;
  onSelectMember: (uuid: string) => void;
}

export default function ProfileContextControls({
  profiles,
  activeProfileName,
  members,
  viewingUuid,
  loading,
  onSelectProfile,
  onSelectMember,
}: ProfileContextControlsProps) {
  const currentMember = members.find((member) => member.uuid === viewingUuid);
  return (
    <>
      {profiles.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-neutral-500">Profile:</span>
          {profiles.map((profile) => (
            <button
              key={profile.profile_id}
              onClick={() => onSelectProfile(profile)}
              disabled={profiles.length === 1 || loading}
              className={`rounded-lg border px-3 py-1 text-sm ${activeProfileName === profile.cute_name ? 'border-emerald-500 bg-emerald-600' : 'border-neutral-700 bg-neutral-900'} ${profiles.length === 1 ? 'cursor-default' : 'hover:border-neutral-500'}`}
            >
              {profile.cute_name} {profile.game_mode ? `(${profile.game_mode})` : ''}
            </button>
          ))}
        </div>
      )}

      {currentMember && (
        <div className="mb-6 flex items-center gap-3">
          <Image src={minecraftAvatarUrl(currentMember.name)} alt="Current player skin" width={40} height={40} className="rounded-lg border border-neutral-700" />
          <div><div className="text-xs uppercase tracking-wide text-neutral-500">Current Player</div><div className="font-semibold">{currentMember.name}</div></div>
        </div>
      )}

      {members.length > 1 && (
        <div className="mb-6">
          <span className="mr-2 text-sm text-neutral-500">Co-op:</span>
          {members.map((member) => (
            <button
              key={member.uuid}
              onClick={() => onSelectMember(member.uuid)}
              disabled={loading}
              className={`mr-2 mb-2 inline-flex items-center rounded-lg border px-3 py-1 text-sm ${viewingUuid === member.uuid ? 'border-emerald-500 bg-emerald-600' : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'} disabled:cursor-wait disabled:opacity-60`}
            >
              <Image src={minecraftAvatarUrl(member.name)} alt={`${member.name} skin`} width={24} height={24} className="mr-2 rounded-full border border-neutral-800" />
              {member.name}
            </button>
          ))}
        </div>
      )}

    </>
  );
}
