<script lang="ts">
  import { goto } from '$app/navigation';
  import { imgUrl } from '$lib/config';
  import { _axios } from '$lib/_axios';
  import { toast } from 'svelte-sonner';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { queryClient } from '$lib/query-client';
  import { createMutation } from '@tanstack/svelte-query';
  import * as Select from '$lib/components/ui/select/index.js';
  import { writable } from 'svelte/store';

  // Global store to track open select box
  const openSelectId = writable<string | null>(null);

  // Props
  export let image: string;
  export let discount: number | null = null;
  export let name: string;
  export let available: boolean = true;
  export let MRP: number;
  export let unit: string;
  export let id: string | number;
  export let favorite: boolean = false;
  export let comboOffer: boolean = false;
  export let offerType: string | null = null;

  // Qty state
  let selectedQty: string | number = ' ';
  const minQty = 1;
  const maxQty = 9999;

  // Generate quantity options (1 to 100, plus 'Qty' for reset)
  const qtyOptions = [
    { value: '0', label: '-' },
    ...Array(100).fill(0).map((_, i) => ({
      value: (i + 1).toString(),
      label: (i + 1).toString(),
    })),
  ];

  // Price calculations
  $: unitPrice = Math.round(MRP - (MRP * (discount || 0) / 100));
  $: totalAmount = unitPrice * (parseInt(selectedQty.toString()) || 1);

  // Navigate
  function handleClick() {
    if (comboOffer) {
      goto(`/comboOffers/${id}`);
    } else {
      if (offerType === 'negotiation' || offerType === 'discount' || offerType === 'onMRP') {
        goto(`/Products/${id}?offerType=${offerType}`);
      } else {
        goto(`/Products/${id}`);
      }
    }
  }

  // Toggle favorite
  async function handleFavorite() {
    const token = localStorage.getItem('token');
    if (!$writableGlobalStore.isLogedIn) {
      toast.error('Please log in to add to favorites');
      goto('/login');
      return;
    }

    try {
      const response = await _axios.post(
        '/favorites/favorite',
        { productId: id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        favorite = !favorite;
        toast.success(response.data.message);
        queryClient.invalidateQueries(['wishCount']);
      } else {
        toast.error(response.data.message || 'Failed to toggle favorite');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        goto('/login');
      } else {
        toast.error(error.response?.data?.message || 'An error occurred while toggling favorite');
      }
    }
  }

  // Cart mutation
  const updateCartMutation = createMutation({
    mutationFn: async (qty: number) => {
      const token = localStorage.getItem('token');
      if (!token || !$writableGlobalStore.isLogedIn) {
        throw new Error('Please log in to add/update cart');
      }

      const response = await _axios.post(
        comboOffer ? '/cart/updateCombo' : '/cart/update',
        {
          products: [
            {
              productId: id,
              quantity: qty,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to update cart');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Cart updated successfully!');
    },
    onError: (error: any) => {
      if (error.message === 'Please log in to add/update cart') {
        toast.error(error.message);
        goto('/login');
      } else {
        toast.error(error.message || 'An error occurred while updating cart');
      }
    },
  });

  // Sync qty with cart
  async function handleQtyChange(qty: string) {
    console.log('Selected Qty:', qty);
    if (qty === 'Qty') {
      if (parseInt(selectedQty.toString()) > 1) {
        const token = localStorage.getItem('token');
        if (!token || !$writableGlobalStore.isLogedIn) {
          toast.error('Please log in to update cart');
          goto('/login');
          return;
        }
        try {
          const response = await _axios.post(
            comboOffer ? '/cart/removeCombo' : '/cart/remove',
            {
              products: [
                {
                  productId: id,
                },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          if (response.data.status) {
            selectedQty = 'Qty';
            toast.success('Product removed from cart');
            queryClient.invalidateQueries(['cart']);
          } else {
            toast.error(response.data.message || 'Failed to remove from cart');
          }
        } catch (err) {
          toast.error('Error removing from cart');
        }
      }
      return;
    }

    let numericQty = parseInt(qty);
    if (numericQty < minQty) numericQty = minQty;
    if (numericQty > maxQty) numericQty = maxQty;
    selectedQty = numericQty.toString();
    try {
      await $updateCartMutation.mutateAsync(numericQty);
    } catch (err) {
      console.error('Cart update failed', err);
    }
  }

  // Handle select open/close
  function handleSelectOpen() {
    $openSelectId = $openSelectId === id.toString() ? null : id.toString();
  }
</script>

<!-- Mobile View -->
<div class="sm:hidden w-full bg-white border rounded-lg shadow p-4 flex items-start gap-4 cursor-pointer" on:click={() => handleClick()}>
  <div class="flex-shrink-0 w-20">
    <img src={imgUrl + image} alt={name} class="w-20 h-20 object-contain rounded" />
  </div>
  <div class="flex-1 flex flex-col gap-2 relative">
    <h3 class="text-base font-bold text-[#222] leading-snug">{name}</h3>
    <div class="flex items-center gap-2">
      {#if discount}
        <span class="line-through text-sm text-gray-400">₹{MRP}</span>
      {/if}
      <span class="text-lg font-semibold text-gray-800">₹{unitPrice}</span>
    </div>
    <p class="text-sm text-gray-600">
      Total: <span class="font-semibold text-gray-900">₹{totalAmount.toFixed(2)}</span>
    </p>
    <p class="text-sm text-green-600 font-medium">
      GST: {discount ? `${discount}%` : '2%'}
    </p>
    <div class="absolute bottom-0 right-0 mb-2 mr-2 flex items-center" on:click|stopPropagation>
      <span class="text-xs text-gray-600 mr-1">Qty</span>
      <Select.Root
        type="single"
        name={`qty-${id}`}
        bind:value={selectedQty}
        on:open={() => handleSelectOpen()}
        open={$openSelectId === id.toString()}
      >
        <Select.Trigger class="flex items-center justify-between w-14 text-base font-semibold">
   <span>
  {qtyOptions.find((q) => q.value === selectedQty)?.label === '-' 
    ? '' 
    : qtyOptions.find((q) => q.value === selectedQty)?.label ?? ' '}
</span>

        </Select.Trigger>
        <Select.Content class="z-[99999]">
          <Select.Group>
            {#each qtyOptions as qty (qty.value)}
              <Select.Item value={qty.value} label={qty.label} on:select={() => handleQtyChange(qty.value)}>
                {qty.label}
              </Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </div>
  </div>
</div>

<!-- Tablet + Desktop View -->
<div
  class="hidden sm:block relative group bg-white border rounded-xl shadow-md overflow-hidden transition-transform duration-200 hover:scale-[1.02] w-full sm:w-44 md:w-56 lg:w-64"
  style="cursor: pointer;"
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  <button
    class="absolute top-2 right-2 bg-white h-8 w-8 flex justify-center items-center rounded-full shadow hover:scale-110 transition-all z-20"
    on:click|stopPropagation={handleFavorite}
  >
    {#if favorite}
      <img class="px-1.5" src="/svg/fav-filled.svg" alt="Favorited" />
    {:else}
      <img class="px-1.5" src="/svg/fav.svg" alt="Favorite" />
    {/if}
  </button>
  <div class="relative h-40 sm:h-44 md:h-48 lg:h-52 flex justify-center items-center bg-gray-50">
    <img class="object-contain max-h-full max-w-full" src={imgUrl + image} alt={name} loading="lazy" />
  </div>
  <div class="px-3 md:px-4 py-2 border-t shadow-inner relative flex flex-col gap-1">
    <h3 class="font-medium text-sm sm:text-base text-[#222222] capitalize truncate" title={name}>
      {name}
    </h3>
    <div class="flex items-center gap-2">
      <span class="text-[#565555] font-semibold text-sm sm:text-base">₹{unitPrice}</span>
      <span class="text-xs sm:text-sm">/ {unit}</span>
      {#if discount}
        <span class="text-[#848484] text-xs sm:text-sm line-through">₹{MRP}</span>
      {/if}
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2 mt-1">
      <div class="flex items-center gap-1 min-w-0">
        <span class="text-[#848484] text-xs sm:text-sm">Total :</span>
        <span class="text-[#30363C] font-semibold text-sm sm:text-base">₹{totalAmount}</span>
      </div>
      <div class="flex items-center gap-2 min-w-14" on:click|stopPropagation>
        <span class="text-xs text-gray-600">Qty</span>
        <Select.Root
          type="single"
          name={`qty-${id}`}
          bind:value={selectedQty}
          on:open={() => handleSelectOpen()}
          open={$openSelectId === id.toString()}
        >
          <Select.Trigger class="w-14 text-center text-base font-semibold">
            {qtyOptions.find((q) => q.value === selectedQty)?.label ?? ''}
          </Select.Trigger>
          <Select.Content class="z-[99999] !min-w-14 max-h-32">
            <Select.Group class="">
              {#each qtyOptions as qty (qty.value)}
                <Select.Item value={qty.value} label={qty.label} on:select={() => handleQtyChange(qty.value)}>
                  {qty.label}
                </Select.Item>
              {/each}
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
    </div>
  </div>
  {#if !available}
    <div class="absolute inset-0 bg-black/40 flex justify-center items-center text-white text-lg font-medium">
      Out of Stock
    </div>
  {/if}
</div>