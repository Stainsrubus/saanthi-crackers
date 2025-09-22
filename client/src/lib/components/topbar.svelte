<script lang="ts">
  import { goto } from '$app/navigation';
  import { _axios } from '$lib/_axios';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { createMutation, createQuery, createInfiniteQuery } from '@tanstack/svelte-query';
  import Icon from '@iconify/svelte';
  import { Badge } from '$lib/components/ui/badge';
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Avatar from './ui/avatar';
  import { toast } from 'svelte-sonner';
  import DropdownMenuSeparator from './ui/dropdown-menu/dropdown-menu-separator.svelte';
  import { imgUrl } from '$lib/config';
  import { page } from '$app/stores';
  import { onMount, onDestroy, tick } from 'svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  interface CartCountResponse {
    message: string;
    status: boolean;
    count: number;
  }

  interface Address {
    _id: string;
    receiverName: string;
    receiverMobile: string;
    flatorHouseno: string;
    area: string;
    landmark: string;
    latitude: number;
    longitude: number;
    addressType: string;
    isPrimary: boolean;
  }

  interface Notification {
    _id: string;
    userId: string;
    type: 'order' | 'promotion' | 'demand' | 'account' | 'other';
    message: string;
    isRead: boolean;
    createdAt: string;
    response?: 'yes' | 'no';
    demand: string;
  }

  interface NotificationResponse {
    notifications: Array<{
      _id: string;
      userId: string;
      type: string;
      description: string;
      isRead: boolean;
      createdAt: string;
      updatedAt: string;
      response?: 'yes' | 'no';
      demand: string;
      __v: number;
    }>;
    currentPage: number;
    totalPages: number;
    total: number;
  }

  interface SearchResult {
    data: any[];
    total: number;
    page: number;
    limit: number;
    status: boolean;
  }

  let searchQuery = '';
  let searchResults: SearchResult | null = null;
  let debounceTimeout: any;
  let hasFetched = false;
  let usernameError = '';
  const addressesQuery = createQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found. Please log in.');
      try {
        const response = await _axios.get('/address/all', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.data.status) throw new Error(response.data.message || 'Failed to fetch addresses');
        return response.data.addresses || [];
      } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Server error while fetching addresses');
      }
    },
    retry: 2,
    staleTime: 30000,
    enabled: $writableGlobalStore.isLogedIn,
  });

  const cartCountQuery = createQuery<CartCountResponse>({
    queryKey: ['cartCount'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        return { status: false, message: "No token found", count: 0 };
      }
      try {
        const response = await _axios.get('/cart/count', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.data.status && response.data.message === "No active cart found") {
          return { status: true, message: "No active cart", count: 0 };
        } else if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to fetch cart count');
        }
        return response.data;
      } catch (error: any) {
        console.error('Cart count error:', error);
        return { status: false, message: error.message, count: 0 };
      }
    },
    retry: 1,
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: $writableGlobalStore.isLogedIn,
  });

  const wishCountQuery = createQuery({
    queryKey: ['wishCount'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const response = await _axios.get('/favorites/count', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.data.status && response.data.message !== "No active wishlist found") {
        throw new Error(response.data.message || 'Failed to fetch wishlist count');
      }
      return response.data;
    },
    retry: 1,
    staleTime: 0,
    enabled: $writableGlobalStore.isLogedIn,
  });

  const groupQuery = createQuery({
    queryKey: ['group'],
    queryFn: async () => {
      const response = await _axios.get('/group/all', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.data.status && response.data.message !== "No active group data found") {
        throw new Error(response.data.message || 'Failed to fetch groups');
      }
      return response.data.groups || [];
    },
    retry: 1,
    staleTime: 0,
  });


  const notificationsQuery = createInfiniteQuery<NotificationResponse, Error, Notification[]>({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam = 1 }) => {
      const token = localStorage.getItem('token');
      // const userData = localStorage.getItem('userData');
       const userId = $writableGlobalStore.userDetails.userId;
      // if (!token || !userId) {
      //   writableGlobalStore.update((store) => ({
      //     ...store,
      //     isLogedIn: false,
      //     userDetails: {
      //       profileImage: '',
      //       userName: '',
      //       mobile: '',
      //       userId: ''
      //     },
      //   }));
      //   throw new Error('No token or user data found. Please log in.');
      // }
      try {
        // console.log('Fetching notifications for userId:', userId);
        // if (!userId) throw new Error('User ID not found');
        const response = await _axios.get(`/notification?page=${pageParam}&limit=10`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        hasFetched = true;
        if (!response.data.status) {
          throw new Error(response.data.message || 'Failed to fetch notifications');
        }
        return {
          notifications: response.data.notifications,
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          total: response.data.total,
        };
      } catch (error: any) {
        console.error('Notifications query error:', error.message);
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch notifications');
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    select: (data) =>
      data.pages
        .flatMap((page) => page.notifications)
        .map((item) => ({
          _id: item._id,
          userId: item.userId,
          type: item.type === 'promotional' ? 'promotion' : item.type,
          title: item.title || '',
          message: item.description || item.message || 'No message provided',
          isRead: item.isRead,
          createdAt: item.createdAt,
          response: item.response,
          demand: item?.demand || '',
        })),
    enabled: $writableGlobalStore.isLogedIn,
    retry: 1,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    onError: (error: any) => {
      console.error('Notifications query error:', error.message);
      if (error.message.includes('token') || error.message.includes('log in')) {
        writableGlobalStore.update((store) => ({ ...store, isLogedIn: false }));
        goto('/login');
      }
    },
  });

  const markAllReadMutation = createMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found.');
      }
      const response = await _axios.post(
        `/notification/mark-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to mark all notifications as read');
      }
      $writableGlobalStore.hasNoti=false
      return response.data;
    },
    onSuccess: () => {
      $notificationsQuery.refetch();
      // $hasNewNotificationsQuery.refetch();
    },
    onError: (error: any) => {
      console.error('Mark all read mutation error:', error.message);
    },
  });

  const searchMutation = createMutation({
    mutationFn: async (query: string) => {
      const response = await _axios.get('/products/search', {
        params: {
          q: query,
          page: 1,
          limit: 10
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      searchResults = data;
    },
    onError: (error) => {
      console.error('Search error:', error);
      searchResults = null;
    }
  });

  function debounceSearch(query: string) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      await tick();
      if (query.trim().length > 0) {
        $searchMutation.mutate(query);
      } else {
        searchResults = null;
      }
    }, 500);
  }

  function handleSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    searchQuery = query;
    debounceSearch(query);
  }

  function clearSearch() {
    searchQuery = '';
    searchResults = null;
  }

  $: currentPath = $page.url.pathname;
  $: cartCount = $writableGlobalStore.isLogedIn ? ($cartCountQuery.data?.count || 0) : 0;
  $: wishCount = $writableGlobalStore.isLogedIn ? ($wishCountQuery.data?.count || 0) : 0;
  $: groupData = $writableGlobalStore.isLogedIn ? ($groupQuery.data || null) : null;
  $: isLoading = $cartCountQuery.isLoading;
  $: error = $cartCountQuery.error ? ($cartCountQuery.error as Error).message : null;
  $: if ($groupQuery.error) {
    console.error('Group query error:', $groupQuery.error.message);
  }
  $: primaryAddress = $writableGlobalStore.isLogedIn && $addressesQuery.data
    ? $addressesQuery.data.find(addr => addr.isPrimary)
    : null;
  $: displayAddress = primaryAddress
    ? `${primaryAddress.flatorHouseno}, ${primaryAddress.area}`
    : ($addressesQuery.data?.length > 0
      ? `${$addressesQuery.data[0].flatorHouseno}, ${$addressesQuery.data[0].area}`
      : '');

  function logout() {
    writableGlobalStore.update(() => ({
      userDetails: {
        profileImage: '',
        userName: '',
        mobile: ''
      },
      isLogedIn: false,
      userId: null,
      hasNoti:false
    }));
    localStorage.removeItem('token');
    localStorage.removeItem('userToken');
    localStorage.removeItem('_id');
    localStorage.removeItem('userData');
    window.location.href = '/';
  }

  let previewImage: string | null = null;
  let isDialogOpen = false;
  let isDropdownOpen = false;
  let isNotificationDrawerOpen = false;
  let notificationDrawerElement: HTMLDivElement | null = null;
  let toggleTimeout: number | null = null;
  let fileInput: HTMLInputElement;
  let observerTarget: HTMLDivElement | null = null;
  let respondedNotifications: Set<string> = new Set();
  let observer: IntersectionObserver | null = null;

  function closeDropdown() {
    isDropdownOpen = false;
  }

  function toggleNotificationDrawer() {
    if (toggleTimeout) return;
    toggleTimeout = setTimeout(() => {
      const wasOpen = isNotificationDrawerOpen;
      isNotificationDrawerOpen = !isNotificationDrawerOpen;
      if (!wasOpen && isNotificationDrawerOpen) {
        $notificationsQuery.refetch();
        if (isNotificationDrawerOpen) {
          $markAllReadMutation.mutate();
        }
      }
      toggleTimeout = null;
    }, 100);
  }

  onMount(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isNotificationDrawerOpen && notificationDrawerElement && !notificationDrawerElement.contains(target)) {
        isNotificationDrawerOpen = false;
      }
      if (searchResults && !target.closest('.search-drawer')) {
        searchResults = null;
        searchQuery = '';
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      if (toggleTimeout) clearTimeout(toggleTimeout);
      if (observer && observerTarget) observer.unobserve(observerTarget);
    };
  });

  $: if (isNotificationDrawerOpen && observerTarget && !observer) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && $notificationsQuery.hasNextPage && !$notificationsQuery.isFetchingNextPage) {
          $notificationsQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerTarget);
  } else if (!isNotificationDrawerOpen && observer && observerTarget) {
    observer.unobserve(observerTarget);
    observer = null;
  }

  const updateProfileMutation = createMutation({
    mutationFn: async (data: { username?: string; profileImage?: File }) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found. Please log in.');
      if (!data.username || data.username.trim() === '') {
        throw new Error('Username is required');
      }
      const formData = new FormData();
      if (data.username) formData.append('username', data.username);
      console.log("updated username",data.username);
      if (data.profileImage) formData.append('profileImage', data.profileImage);
      const response = await _axios.put('/user/', formData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      if (!response.data.status) throw new Error(response.data.message || 'Failed to update profile');
      return response.data;
    },
    onSuccess: (data) => {
      writableGlobalStore.update((store) => ({
        ...store,
        userDetails: {
          ...store.userDetails,
          userName: data.user.username || store.userDetails.userName,
          profileImage: data.user.profileImage || store.userDetails.profileImage,
        },
      }));
      toast.success('Profile updated successfully');
      isDialogOpen = false;
      previewImage = null;
      usernameError = '';
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      usernameError = errorMessage === 'Username is required' ? errorMessage : '';
      toast.error(errorMessage);
    },
  });

  function openDialog() {
    closeDropdown();
    isDialogOpen = true;
  }

  function closeDialog() {
    isDialogOpen = false;
    usernameError = '';
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const username = formData.get('username') as string;
    const profileImage = formData.get('profileImage') as File;
    const payload: { username: string; profileImage?: File } = { username };
    if (profileImage && profileImage.size > 0) {
      payload.profileImage = profileImage;
    }
    $updateProfileMutation.mutate(payload);
  }

  function getInitials(name: string) {
    return name.charAt(0).toUpperCase();
  }

  function triggerFileUpload() {
    if (fileInput) {
      fileInput.click();
    }
  }

  function handleImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      previewImage = URL.createObjectURL(file);
    }
  }

  function formatDate(dateString: string | number | Date) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'pm' : 'am';
    return `${day}/${month}/${year}, ${hours}:${minutes}${ampm}`;
  }

  const typeStyles = {
    order: { icon: 'mdi:cart', color: 'bg-blue-100 text-blue-600' },
    promotion: { icon: 'mdi:tag', color: 'bg-green-100 text-green-600' },
    demand: { icon: 'solar:reorder-linear', color: 'bg-yellow-100 text-yellow-600' },
    account: { icon: 'mdi:account', color: 'bg-purple-100 text-purple-600' },
    other: { icon: 'mdi:bell', color: 'bg-gray-100 text-gray-600' },
  };
</script>

<style>
  .social-icon {
    width: 20px;
    height: 20px;
    margin: 0 4px;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
  }

  .responsive-text {
    font-size: clamp(0.7rem, 2vw, 1rem);
  }

  .translate-x-full {
    transform: translateX(100%);
  }
</style>

<div class="flex items-center justify-between h-[70px] z-50 w-screen lg:px-10 md:px-5 px-2 bg-white shadow-lg">
  <!-- Left Section: Logo and Address -->
  <div class="flex items-center md:gap-4 gap-1">
    <!-- Logo -->
    <div onclick={() => goto('/')} class="cursor-pointer">
      <img src="/logo.png" alt="Logo" class="md:max-w-[130px] max-w-[130px]" />
    </div>
    <!-- Separator -->
    <div class="items-center lg:gap-6 xl:flex hidden md:gap-4 gap-2">
      <div onclick={() => goto('/')} class="flex items-center gap-2 cursor-pointer">
        <img
          src={currentPath === '/' ? '/svg/home 1-filled.svg' : '/svg/home 1.svg'}
          alt="Offer"
        />
        <p class={`${currentPath === '/' ? 'text-primary' : 'text-black'}`}>Home</p>
      </div>
      <div onclick={() => goto('/Products')} class="flex items-center gap-2 cursor-pointer">
        <img
          src={currentPath === '/Products' ? '/svg/rocket-filled.svg' : '/svg/rocket.svg'}
          alt="fac"
        />
        <p class={`${currentPath === '/Products' ? 'text-primary' : 'text-black'}`}>Products</p>
      </div>

      <div onclick={() => goto('/quickorders')} class="flex items-center gap-2 cursor-pointer">
        <img
          src={currentPath === '/quickorders' ? '/svg/rocket-filled.svg' : '/svg/rocket.svg'}
          alt="fac"
        />
        <p class={`${currentPath === '/quickorders' ? 'text-primary' : 'text-black'}`}>Quick Orders</p>
      </div>

      <div onclick={() => goto('/wishlist')} class="flex items-center gap-2 cursor-pointer">
        <img
          src={currentPath === '/wishlist' ? '/svg/fav-filled.svg' : '/svg/fav.svg'}
          alt="fac"
        />
        <p class={`${currentPath === '/wishlist' ? 'text-primary' : 'text-black'}`}>Wishlist</p>
      </div>

      <div onclick={() => goto('/about-us')} class="flex items-center gap-2 cursor-pointer">
        <img
          src={currentPath === '/about-us' ? '/svg/info-filled.svg' : '/svg/info.svg'}
          alt="fac"
        />
        <p class={`${currentPath === '/about-us' ? 'text-primary' : 'text-black'}`}>About</p>
      </div>

      <!-- <div onclick={() => goto('/cart')} class="flex items-center gap-2 cursor-pointer">
        <div class="relative">
          <img
            src={currentPath === '/cart' ? '/svg/cart-filled.svg' : '/svg/cart.svg'}
            alt="Cart"
          />
          {#if !$writableGlobalStore.isLogedIn}
          {:else if cartCount > 0}
            <span class={`absolute -top-1 -right-1 bg-custom-gradient text-white rounded-full flex items-center justify-center text-xs font-semibold ${currentPath === '/cart' ? 'border border-white min-w-5 min-h-5' : 'border-none min-w-4 min-h-4'}`}>
              {cartCount}
            </span>
          {/if}
        </div>
        <p class={`${currentPath === '/cart' ? 'text-primary' : 'text-black'}`}>Cart</p>
      </div>
     -->
    </div>
  </div>

  <div class="w-1/2 flex gap-3 justify-end">
    <!-- Search Bar (Hidden on Mobile) -->
<div class="hidden md:block flex-1 mx-4 lg:max-w-96 md:max-w-72 relative">
  <!-- Search bar -->
  <div class="flex w-full rounded-full bg-white md:p-1 p-1 shadow-md border border-gray-300 focus-within:ring-2 focus-within:ring-purple-500">
    <div class="relative w-full">
      <input
        type="text"
        placeholder="Search products"
        class="w-full md:text-xl text-lg placeholder:text-base pl-9 pr-4 py-2 rounded-full focus:outline-none text-gray-700"
        oninput={handleSearch}
        bind:value={searchQuery}
      />
      <img
        class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
        src="/svg/search.svg"
        alt="search"
      />
    </div>

    {#if searchResults}
      <button
        onclick={clearSearch}
        class="ml-2 bg-custom-gradient font-medium text-white px-3 py-2 rounded-full hover:bg-[#156aa3] transition-colors duration-200 flex items-center justify-center"
      >
        <Icon icon="lucide:x" class="inline-block" width="20" />
      </button>
    {/if}
  </div>

  <!-- Search results dropdown -->
  {#if searchResults}
    <div class="absolute left-0 right-0 mt-2 lg:max-w-96 md:max-w-72 lg:max-h-64 max-h-52 overflow-y-auto bg-white rounded-3xl shadow-md py-4 pl-4 z-50">
      {#if searchResults.data.length > 0}
        {#each searchResults.data as product, index}
          <div
            onclick={() => {
              goto(`/Products/${product._id}`);
              searchResults = null;
              searchQuery = '';
            }}
            class="cursor-pointer {index === searchResults.data.length - 1 ? '' : 'border-b'} flex items-center md:gap-10 gap-2 p-1"
          >
            <div class="border lg:p-3 md:p-2 p-1 rounded-lg">
              <img src={imgUrl + product.images[0]} alt="" class="min-w-12 min-h-12 h-12 w-12" />
            </div>
            <div>
              <h2 class="md:text-xl text-base font-semibold text-[#30363C]">{product.productName}</h2>
              <p class="md:text-base text-sm font-bold text-[#111827]">
                MRP: <span class="text-gray-600 px-2 text-base line-through">₹{product?.strikePrice || product.price}</span> ₹{product.price}
              </p>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center text-lg mt-4 text-gray-400">No results found</div>
      {/if}
    </div>
  {/if}
</div>

    <!-- for mobile -->
    <div onclick={() => goto('/cart')} class="flex xl:hidden items-center gap-2 cursor-pointer">
      <div class="relative">
        <img
          src={currentPath === '/cart' ? '/svg/cart-filled.svg' : '/svg/cart.svg'}
          alt="Cart"
        />
        {#if !$writableGlobalStore.isLogedIn}
        {:else if cartCount > 0}
          <span class={`absolute -top-1 -right-1 bg-custom-gradient text-white rounded-full flex items-center justify-center text-xs font-semibold ${currentPath === '/cart' ? 'border border-white min-w-5 min-h-5' : 'border-none min-w-4 min-h-4'}`}>
            {cartCount}
          </span>
        {/if}
      </div>
    </div>
      <!-- Notification with Tooltip -->
      {#if $writableGlobalStore.isLogedIn}
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div
                onclick={toggleNotificationDrawer}
                class="flex items-center gap-2 cursor-pointer"
              >
                <div class="relative">
                  <img src="/svg/Notification.svg" alt="Notification" />
                  {#if $writableGlobalStore.hasNoti}
                    <span class="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
                  {/if}
                </div>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p class="font-bold">Notifications</p>
              <p class="font-thin">View new notifications!</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      {/if}
    <div class="flex items-center gap-2 cursor-pointer relative">
      {#if $writableGlobalStore.isLogedIn}
        <DropdownMenu.Root bind:open={isDropdownOpen}>
          <DropdownMenu.Trigger class='focus:ring-0 outline-none'>
            <Avatar.Root class="md:mx-4 cursor-pointer border focus:ring-0 outline-none">
              {#if $writableGlobalStore.userDetails.profileImage}
                <img
                  src={imgUrl + $writableGlobalStore.userDetails.profileImage}
                  alt="User Profile"
                  class="w-full h-full object-cover rounded-full"
                />
              {:else if $writableGlobalStore.userDetails.userName}
                <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-custom-gradient">
                  {getInitials($writableGlobalStore.userDetails.userName)}
                </span>
              {:else}
                <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-custom-gradient">
                  U
                </span>
              {/if}
            </Avatar.Root>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class='w-screen max-w-72 mt-4'>
            <DropdownMenu.Group>
              <div class="flex gap-0 items-center">
                <Avatar.Root class="ml-2 cursor-pointer border">
                  {#if $writableGlobalStore.userDetails.profileImage}
                    <img
                      src={imgUrl + $writableGlobalStore.userDetails.profileImage}
                      alt="User Profile"
                      class="w-full h-full object-cover rounded-full"
                    />
                  {:else if $writableGlobalStore.userDetails.userName}
                    <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-custom-gradient">
                      {getInitials($writableGlobalStore.userDetails.userName)}
                    </span>
                  {:else}
                    <span class="text-white text-lg font-semibold flex items-center justify-center w-full h-full rounded-full bg-custom-gradient">
                      U
                    </span>
                  {/if}
                </Avatar.Root>
                <div class="flex md:px-0 w-full items-center justify-between">
                  <DropdownMenu.Item>
                    <p class="text-[#30363C] flex flex-col font-medium text-lg">
                      {$writableGlobalStore.userDetails.userName || 'Username'}
                      <span class="text-[#718491] text-sm">
                        {$writableGlobalStore.userDetails.mobile}
                      </span>
                    </p>
                  </DropdownMenu.Item>
                  <Icon icon="hugeicons:pencil-edit-02" class="text-gray-600 cursor-pointer mr-3" height={24} width={24} onclick={openDialog} />
                </div>
              </div>
              <DropdownMenuSeparator class="bg-gray-200" />
              <div>
                <DropdownMenu.Item class='' onclick={() => goto('/Products')}>
                  <div class="flex justify-between text-[#30363C] items-center font-medium text-lg w-full px-2">
                    <p>Products</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200" />
                <DropdownMenu.Item class='' onclick={() => goto('/wishlist')}>
                  <div class="flex justify-between text-[#30363C] items-center font-medium text-lg w-full px-2">
                    <p>Wishlist <span class="text-base">({wishCount})</span></p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200" />
                <DropdownMenu.Item class='' onclick={() => goto('/address-management')}>
                  <div class="flex justify-between text-[#30363C] items-center font-medium text-lg w-full px-2">
                    <p>Address Management</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200" />
                <DropdownMenu.Item class='' onclick={() => goto('/order-history')}>
                  <div class="flex justify-between font-medium text-[#30363C] text-lg items-center w-full px-2">
                    <p>Order history</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200" />
                <DropdownMenu.Item class='' onclick={() => goto('/demand-products')}>
                  <div class="flex justify-between font-medium text-lg items-center text-[#30363C] w-full px-2">
                    <p>Demand Products</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
                <DropdownMenuSeparator class="bg-gray-200" />
                <DropdownMenu.Item class='' onclick={() => goto('/about-us')}>
                  <div class="flex justify-between text-[#30363C] font-medium text-lg items-center w-full px-2">
                    <p>About Us</p>
                    <Icon icon="lucide:move-right" />
                  </div>
                </DropdownMenu.Item>
              </div>
              <DropdownMenuSeparator class="bg-gray-400" />
              <DropdownMenu.Item class="text-lg" onclick={() => logout()}>
                <div class="flex justify-between font-medium text-lg items-center w-full px-2">
                  <p>Logout</p>
                  <Icon icon="lucide:log-out" />
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        {#if isDropdownOpen}
          <div class="fixed inset-0 bg-black bg-opacity-50 z-50"></div>
        {/if}
      {:else}
        <button
          onclick={() => goto('/login')}
          class="flex items-center gap-2"
        >
          <img src="/svg/login.svg" alt="Login" class="hidden md:block" />
          <span class="lg:text-xl md:text-lg text-base text-[#30363C] font-semibold">Login</span>
        </button>
      {/if}
    </div>
  </div>
</div>

<div class="py-2 bg-light">
  <div class="flex items-center h-full overflow-x-auto w-screen scrollbar-hide px-5  pr-24 gap-6">
    {#if $groupQuery.isLoading}
      <div class="flex gap-5 items-center justify-start">
        {#each Array(5) as _}
          <div class="shrink-0">
            <Skeleton class="h-5 w-20" />
          </div>
        {/each}
      </div>
    {:else if $groupQuery.error}
      <div class="text-red-500 text-lg font-semibold">Error loading groups: {$groupQuery.error.message}</div>
    {:else if $groupQuery.data}
      <div class="flex gap-6">
        {#each $groupQuery.data as group}
          <div
            onclick={() => {
              goto(`/Products?group=${group._id}`);
            }}
            class="flex items-center gap-2 shrink-0 hover:underline hover:scale-105 transition-all cursor-pointer"
          >
            <img
              src={imgUrl + group.image || '/wholesale.png'}
              alt={group.name}
              class="w-6 h-6 object-contain"
            />
            <p class="text-primary capitalize text-base font-bold whitespace-nowrap">
              {group.name}
            </p>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>


<!-- Notification Dropdown -->
{#if $writableGlobalStore.isLogedIn}
  <div
    class="fixed inset-0 z-40 {isNotificationDrawerOpen ? 'block' : 'hidden'}"
    onclick={() => (isNotificationDrawerOpen = false)}
  ></div>
  <div
    class="fixed lg:right-10 md:right-10 right-1 top-[110px] z-50 w-full max-w-xs max-h-[50vh] overflow-y-auto bg-white rounded-lg shadow-xl transform transition-all duration-200 ease-in-out {isNotificationDrawerOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}"
    bind:this={notificationDrawerElement}
    role="dialog"
    aria-label="Notification dropdown"
  >
    <div class="overflow-y-auto">
      {#if $notificationsQuery.isLoading}
        <div class="p-4 space-y-2">
          {#each Array(3) as _}
            <Skeleton class="h-12 w-full" />
          {/each}
        </div>
      {:else if $notificationsQuery.error}
        <div class="text-center p-4 text-red-500">
          Error loading notifications: {$notificationsQuery.error.message}
        </div>
      {:else if $notificationsQuery.data?.length === 0}
        <div class="text-center p-4 text-[#4F585E]">
          No notifications found.
        </div>
      {:else}
        <div class="divide-y">
          {#each $notificationsQuery?.data as notification (notification._id)}
            <div
              class="flex items-start gap-3 p-4 hover:bg-gray-50 {notification.isRead ? 'bg-gray-50' : 'bg-white'}"
            >
              <div
                class="{typeStyles[notification.type]?.color || 'bg-gray-100 text-gray-600'} p-2 rounded-full flex-shrink-0"
              >
                <Icon icon={typeStyles[notification.type]?.icon || 'mdi:bell'} class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-base text-[#30363C] font-medium truncate">
                  {notification.title}
                </p>
                <p class="text-sm text-[#30363Cd9] {notification.isRead ? '' : 'font-medium'}">
                  {notification.message}
                </p>
                <p class="text-xs text-[#4f585Ebb] mt-1">
                  {formatDate(notification.createdAt)}
                </p>
                
              </div>
            </div>
          {/each}
          {#if $notificationsQuery.isFetchingNextPage}
            <div class="p-4 flex items-center justify-center w-full">
              <Icon icon='line-md:loading-twotone-loop' class="w-8 h-8" />
            </div>
          {/if}
          <div bind:this={observerTarget} class="h-1"></div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Edit Profile Dialog -->
{#if isDialogOpen}
  <div class="fixed inset-0 bg-black top-0 bg-opacity-50 z-50" onclick={closeDialog}></div>
  <div class="fixed top-0 right-0 h-full lg:w-[600px] w-screen bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out translate-x-0" class:translate-x-full={!isDialogOpen}>
    <div class="p-6 h-full flex flex-col">
      <div class="flex justify-between">
        <h2 class="text-3xl text-[#30363C] font-semibold mb-4 flex items-center gap-2">
          <Icon onclick={closeDialog} icon="lucide:arrow-left" class="w-6 h-6 text-[#4F585E] cursor-pointer" />
          Edit Profile
        </h2>
      </div>
      <form onsubmit={handleSubmit} class="space-y-4 flex-grow">
        <div class="flex flex-col justify-center items-center">
          <div class="relative bg-white">
            <img
              src={previewImage || imgUrl + $writableGlobalStore.userDetails.profileImage || '/images/profile.jpg'}
              alt="Profile"
              class="h-32 w-32 object-contain rounded-full border"
              onerror={() => previewImage = '/images/profile.jpg'}
            />
            <div class="absolute bottom-0 right-0">
              <Icon icon="hugeicons:pencil-edit-02" class="text-gray-600 bg-white rounded-lg" height={28} width={28} onclick={triggerFileUpload} />
            </div>
          </div>
          <input
            type="file"
            id="profileImage"
            name="profileImage"
            accept="image/*"
            bind:this={fileInput}
            class="hidden"
            onchange={handleImageChange}
          />
        </div>
        <div>
          <label for="username" class="block text-xl font-semibold text-gray-700">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            autocomplete="off"
            placeholder="Enter Username"
            value={$writableGlobalStore.userDetails.userName || ''}
            class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 focus:ring-0 focus:outline-none text-sm"
          />
          {#if usernameError}
            <p class="mt-1 text-sm text-red-500">{usernameError}</p>
          {/if}
        </div>
        <div>
          <label for="mobile" class="block text-xl font-semibold text-gray-700">Mobile Number</label>
          <input
            type="text"
            id="mobile"
            name="mobile"
            disabled
            autocomplete="off"
            value={$writableGlobalStore.userDetails.mobile || ''}
            class="mt-1 block w-full border-gray-300 rounded-lg border shadow-sm h-10 p-2 focus:ring-0 focus:outline-none text-sm"
          />
        </div>
        <div class="mt-auto">
          <button
            type="submit"
            class="w-full bg-custom-gradient text-white py-2 px-4 rounded-lg hover:scale-105 transition-transform"
            disabled={$updateProfileMutation.isLoading}
          >
            {#if $updateProfileMutation.isLoading}Updating...{:else}Update{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
