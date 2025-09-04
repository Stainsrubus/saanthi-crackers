<script lang="ts">
	import { _axios } from '$lib/_axios';
	import { createInfiniteQuery } from '@tanstack/svelte-query';
	import { onMount, onDestroy } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import Icon from '@iconify/svelte';

	// Function to format the relative time for notifications
	const formatRelativeTime = (date: string) => {
	  const now = new Date();
	  const notificationDate = new Date(date);
	  const diffInMs = now.getTime() - notificationDate.getTime();
	  const diffInSeconds = Math.floor(diffInMs / 1000);
	  const diffInMinutes = Math.floor(diffInSeconds / 60);
	  const diffInHours = Math.floor(diffInMinutes / 60);
	  const diffInDays = Math.floor(diffInHours / 24);

	  // Check if the notification is from today
	  const isToday = now.toDateString() === notificationDate.toDateString();

	  if (isToday) {
		if (diffInMinutes < 1) {
		  return 'Just now';
		}
		if (diffInMinutes < 60) {
		  return `${diffInMinutes}m ago`;
		}
		if (diffInHours < 24) {
		  return `${diffInHours}h ago`;
		}
	  }

	  // Check if the notification is within the last 3 days
	  if (diffInDays > 0 && diffInDays <= 5) {
		return `${diffInDays}d ago`;
	  }

	  // For older notifications, show only the date (e.g., "Jul 8, 2025")
	  return notificationDate.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	  });
	};

	// Function to format the exact date and time
	const formatExactTime = (date: string) => {
	  const notificationDate = new Date(date);
	  return notificationDate.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	  });
	};

	interface Notification {
	  _id: string;
	  title: string;
	  description: string;
	  type: string;
	  isRead: boolean;
	  createdAt: string;
	  updatedAt: string;
	  __v: number;
	}

	interface NotificationResponse {
	  notifications: Notification[];
	  currentPage: number;
	  totalPages: number;
	  total: number;
	  hasMore: boolean;
	}

	const notificationsQuery = createInfiniteQuery({
	  queryKey: ['notifications'],
	  queryFn: async ({ pageParam = 1 }) => {
		const token = localStorage.getItem('token');
		const response = await _axios.get<NotificationResponse>(
		  `/notification/all?page=${pageParam}&limit=5`,
		  {
			headers: {
			  Authorization: `Bearer ${token}`,
			  'Content-Type': 'application/json',
			},
		  }
		);
		return response.data;
	  },
	  initialPageParam: 1,
	  getNextPageParam: (lastPage) => {
		if (lastPage.currentPage >= lastPage.totalPages) {
		  return undefined;
		}
		return lastPage.currentPage + 1;
	  },
	});

	let container: HTMLDivElement;
	let observerTarget: HTMLDivElement;
	let observer: IntersectionObserver | null = null;

	onMount(() => {
	  observer = new IntersectionObserver(
		(entries) => {
		  if (
			entries[0].isIntersecting &&
			$notificationsQuery.hasNextPage &&
			!$notificationsQuery.isFetchingNextPage
		  ) {
			$notificationsQuery.fetchNextPage();
		  }
		},
		{ threshold: 0.1, rootMargin: '100px' }
	  );
	  if (observerTarget) {
		observer.observe(observerTarget);
	  }
	  return () => {
		if (observer && observerTarget) {
		  observer.unobserve(observerTarget);
		}
	  };
	});

	onDestroy(() => {
	  if (observer && observerTarget) {
		observer.unobserve(observerTarget);
	  }
	});
</script>

<svelte:head>
	<title>Notifications</title>
	<meta name="description" content="View your notifications" />
</svelte:head>

<div class="container overflow-y-auto w-full h-[calc(100vh-100px)] hidescrollbarthumb" bind:this={container}>
	<div class="max-w-5xl mx-auto text-zinc-800 my-4 !font-pt">
		<h1 class="text-2xl font-bold py-2">Notifications</h1>
	</div>
	<div class="max-w-5xl mx-auto grid grid-cols-1 gap-3 p-3">
		{#if $notificationsQuery.isLoading}
			<div class="p-4 space-y-2">
				{#each Array(4) as _}
					<div class="h-12 w-full bg-zinc-100 rounded-lg animate-pulse"></div>
				{/each}
			</div>
		{:else if $notificationsQuery.error}
			<div class="text-center p-4 text-red-500">
				Error loading notifications: {$notificationsQuery.error.message}
			</div>
		{:else if $notificationsQuery.data?.pages?.flatMap((page) => page.notifications).length === 0}
			<div class="text-center p-4 text-zinc-500">
				No notifications found.
			</div>
		{:else}
			{#each $notificationsQuery.data?.pages as page}
				{#each page.notifications as notification}
					<Card.Root class="bg-zinc-50 border-primary border rounded-lg p-0 shadow-sm hover:shadow-md transition-shadow">
						<Card.Content class="flex items-center px-3 py-2 justify-between gap-3">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<Icon class="text-lg text-zinc-600" icon={'mynaui:bell'} />
									<span class="font-semibold text-zinc-700 truncate">{notification.title}</span>
								</div>
								<p class="text-sm text-zinc-600 mt-1 truncate">{notification.description}</p>
							</div>
							<div class="text-xs text-zinc-400 flex flex-col items-end gap-1 whitespace-nowrap">
								<div>{formatRelativeTime(notification.createdAt)}</div>
								<div class="text-xs text-zinc-500">{formatExactTime(notification.createdAt)}</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			{/each}
		{/if}
	</div>
	<div class="text-center p-3">
		{#if $notificationsQuery.isFetchingNextPage}
			<div class="flex items-center justify-center w-full">
				<Icon icon="line-md:loading-twotone-loop" class="w-8 h-8 text-zinc-500" />
			</div>
		{:else if !$notificationsQuery.hasNextPage && $notificationsQuery.data?.pages?.length > 0}
			<p class="text-sm text-zinc-500">End of notifications</p>
		{/if}
	</div>
	<div class="h-1" bind:this={observerTarget}></div>
</div>

<style>
	.hidescrollbarthumb::-webkit-scrollbar-thumb {
		display: none;
	}
</style>
