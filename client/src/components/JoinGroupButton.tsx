import { Link, useRouterState } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, LogOut, UserPlus } from 'lucide-react';
import { spotsOpen, type RoommatePost } from '@/data/data';
import { api } from '@/data/api';
import { meQueryOptions } from '@/data/queries';
import { cn } from '@/lib/cn';
import { buttonStyles } from './Button';

/**
 * Join or leave a roommate group from the API (/api/groups). Only students can be in groups;
 * the person who started a group can't leave it.
 */
export function JoinGroupButton({ post, className }: { post: RoommatePost; className?: string }) {
  const href = useRouterState({ select: (s) => s.location.href });
  const queryClient = useQueryClient();
  const { data: me, isPending } = useQuery(meQueryOptions());

  const joined = Boolean(me && post.memberIds?.includes(me.id));
  const isCreator = Boolean(me && post.createdBy === me.id);
  const full = spotsOpen(post) === 0;

  const mutation = useMutation({
    mutationFn: () => (joined ? api.leaveGroup(post.id) : api.joinGroup(post.id)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['roommates'] }),
  });

  if (isPending) {
    return <span aria-hidden="true" className={cn(buttonStyles({ color: 'outline' }), 'opacity-50', className)} />;
  }

  if (!me) {
    return (
      <Link to="/sign-in" search={{ redirect: href }} className={buttonStyles({ color: 'ink', className })}>
        <UserPlus size={17} aria-hidden="true" /> Sign in to join
      </Link>
    );
  }

  if (isCreator) {
    return (
      <p className={cn('rounded-xl bg-wash px-4 py-2.5 text-center font-text text-sm text-ink-soft', className)}>
        You started this group
      </p>
    );
  }

  if (me.role !== 'student') {
    return (
      <p className={cn('rounded-xl bg-wash px-4 py-2.5 text-center font-text text-sm text-ink-soft', className)}>
        Only students can join groups
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={mutation.isPending || (!joined && full)}
        aria-label={joined ? `Leave ${post.title}` : `Join ${post.title}`}
        onClick={() => mutation.mutate()}
        className={buttonStyles({ color: joined ? 'outline' : 'ink', className: 'w-full' })}
      >
        {joined ? <LogOut size={17} aria-hidden="true" /> : full ? <Check size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}
        {mutation.isPending ? (joined ? 'Leaving…' : 'Joining…') : joined ? 'Leave group' : full ? 'Group is full' : 'Join group'}
      </button>
      {mutation.error && (
        <p role="alert" className="mt-2 font-text text-[0.8125rem] text-danger">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
