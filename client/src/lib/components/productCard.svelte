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
  import { get } from 'svelte/store';

  // Global store to track open select box
  const openSelectId = writable<string | null>(null);

  // Props
  export let image: string;
  export let discount: number | null = null;
  export let name: string;
  export let available: boolean = true;
  export let MRP: number;
  export let stock: number = 100; 
  export let unit: string;
  export let id: string | number;
  export let favorite: boolean = false;
  export let comboOffer: boolean = false;
  export let offerType: string | null = null;

  // Qty state
  let selectedQty: string | number = ' ';
  const minQty = 1;
  const maxQty = 9999;

  // Fixed: Generate quantity options with proper stock handling
  $: qtyOptions = (() => {
    const options = [{ value: '0', label: '-' }];
    
    if (stock && stock > 0) {
      const maxAvailable = Math.min(stock, 100); // Limit to 100 options max for performance
      for (let i = 1; i <= maxAvailable; i++) {
        options.push({ value: i.toString(), label: i.toString() });
      }
    }
    
    return options;
  })();

  // Price calculations
  $: unitPrice = Math.round(MRP - (MRP * (discount || 0) / 100));
  $: totalAmount = unitPrice * (parseInt(selectedQty.toString()) || 1);
  
  // Stock status
  $: isOutOfStock = !available || stock <= 0;
  $: lowStock = stock > 0 && stock <= 10;

  // Navigate
  function handleClick() {
    if (isOutOfStock) return; // Don't navigate if out of stock
    
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
    if (isOutOfStock) return; // Don't allow favoriting out of stock items
    
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

  const removeProductMutation = createMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await _axios.delete(`/cart/remove-product/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.data.status) throw new Error(response.data.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cartCount']);
      toast.success('Product removed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove product');
    },
  });

  // Cart mutation
  const updateCartMutation = createMutation({
    mutationFn: async (qty: number) => {
      const token = localStorage.getItem('token');
      const isLoggedIn = get(writableGlobalStore).isLogedIn;
      
      if (!token || !isLoggedIn) {
        throw new Error('Please log in to add/update cart');
      }

      if (qty > stock) {
        throw new Error(`Only ${stock} items available in stock`);
      }

      const response = await _axios.post(
        '/cart/update',
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
      queryClient.invalidateQueries(['cartCount']);
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

  async function handleQtyChange(qty: string) {
    if (isOutOfStock) return; // Don't allow quantity changes for out of stock items
    
    const token = localStorage.getItem('token');
    if (!token || !get(writableGlobalStore).isLogedIn) {
      toast.error('Please log in to update cart');
      goto('/login');
      return;
    }

    let numericQty = parseInt(qty);
    
    // Handle remove product case (qty = 0)
    if (numericQty === 0) {
      $removeProductMutation.mutate(id.toString());
      selectedQty = '0';
      return;
    }
    
    // Validate quantity range
    if (numericQty < minQty) numericQty = minQty;
    if (numericQty > maxQty) numericQty = maxQty;
    
    // Validate against stock
    if (numericQty > stock) {
      toast.error(`Only ${stock} items available in stock`);
      numericQty = stock;
    }

    selectedQty = numericQty.toString();

    try {
      console.log('Updating cart with qty:', numericQty);
      await $updateCartMutation.mutateAsync(numericQty);
    } catch (err) {
      console.error('Cart update failed', err);
    }
  }

  // Handle select open/close
  function handleSelectOpen() {
    if (isOutOfStock) return; // Don't open select for out of stock items
    $openSelectId = $openSelectId === id.toString() ? null : id.toString();
  }

  function handleKeydown(event: KeyboardEvent, callback: Function) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  }

</script>

<!-- Mobile View -->
<div 
  class="sm:hidden w-full bg-white border rounded-lg shadow p-4 flex items-start gap-4 cursor-pointer {isOutOfStock ? 'opacity-60' : 'cursor-pointer'}" 
  on:click={handleClick}
  on:keydown={(e) => handleKeydown(e, handleClick)}
  role="button"
  tabindex={isOutOfStock ? '-1' : '0'}
  aria-disabled={isOutOfStock}
>
  <div class="flex-shrink-0 w-[20%] items-center justify-center">
    <img src={imgUrl + image} alt={name} class="object-contain rounded" />
  </div>
  <div class="flex-1 flex flex-col gap-2 relative">
    <h3 class="text-base font-bold text-[#222] leading-snug">{name}</h3>
    
    <!-- Stock Information -->
    {#if isOutOfStock}
      <div class="text-red-500 text-sm font-medium">Out of Stock</div>
    {:else if lowStock}
      <div class="text-orange-500 text-sm font-medium">Only {stock} left</div>
    {:else}
      <div class="text-green-500 text-sm font-medium">In Stock</div>
    {/if}
    
    <div class="flex items-center gap-2">
      {#if discount}
        <span class="line-through text-sm text-gray-400">₹{MRP}</span>
      {/if}
      <span class="text-sm font-semibold text-gray-800">₹{unitPrice}</span>
      <span class="text-xs text-gray-500">/ {unit}</span>
    </div>
    <p class="text-xs text-gray-600">
      Total: <span class="font-semibold text-gray-900">₹{totalAmount.toFixed(2)}</span>
    </p>
    
    {#if !isOutOfStock}
      <div class="absolute bottom-0 right-0 mb-0 mr-0 flex items-center" on:click|stopPropagation>
        <div class="flex items-end">
          <span class="text-xs text-gray-600 mr-1">Qty</span>
          <Select.Root
            type="single"
            name={`qty-${id}`}
            bind:value={selectedQty}
            on:open={() => handleSelectOpen()}
            onValueChange={(value) => handleQtyChange(value)}
            open={$openSelectId === id.toString()}
            disabled={isOutOfStock}
          >
            <Select.Trigger 
              class="flex items-center justify-between w-21 h-8 text-xs font-semibold sm:w-19 sm:h-9 sm:text-base {isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}"
              disabled={isOutOfStock}
            >
              {selectedQty === '0' || selectedQty === ' ' ? '' : selectedQty}
            </Select.Trigger>
            <Select.Content class="z-[30] !min-w-14 max-h-32 text-sm">
              <Select.Group>
                {#each qtyOptions as qty (qty.value)}
                  <Select.Item value={qty.value} label={qty.label}>
                    {qty.label}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Tablet + Desktop View - Fixed -->
<div
  class="hidden sm:block relative group bg-white border rounded-xl shadow-md overflow-hidden transition-transform duration-200 {isOutOfStock ? 'opacity-60' : 'hover:scale-[1.02]'} w-full sm:w-44 md:w-56 lg:w-64"
  on:click={handleClick}
  on:keydown={(e) => handleKeydown(e, handleClick)}
  role="button"
  tabindex={isOutOfStock ? '-1' : '0'}
  aria-disabled={isOutOfStock}
>
  {#if !isOutOfStock}
    <button
      class="absolute top-2 right-2 bg-white h-8 w-8 flex justify-center items-center rounded-full shadow hover:scale-110 transition-all z-20"
      on:click|stopPropagation={handleFavorite}
      aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {#if favorite}
        <img class="px-1.5" src="/svg/fav-filled.svg" alt="Favorited" />
      {:else}
        <img class="px-1.5" src="/svg/fav.svg" alt="Favorite" />
      {/if}
    </button>
  {/if}
  
  <div class="relative h-40 sm:h-44 md:h-48 lg:h-52 flex justify-center items-center bg-gray-50">
    <img class="object-contain max-h-full max-w-full" src={imgUrl + image} alt={name} loading="lazy" />
  </div>
  
  <div class="px-3 md:px-4 py-2 border-t shadow-inner relative flex flex-col gap-1">
    <h3 class="font-medium text-sm sm:text-base text-[#222222] capitalize truncate" title={name}>
      {name}
    </h3>
    
    <!-- Stock Information -->
    {#if isOutOfStock}
      <div class="text-red-500 text-sm font-medium">Out of Stock</div>
    {:else if lowStock}
      <div class="text-orange-500 text-sm font-medium">Only {stock} left</div>
    {:else}
      <div class="text-green-500 text-sm font-medium">In Stock</div>
    {/if}
    
    <div class="flex items-center gap-2">
      <span class="text-[#565555] font-semibold text-sm sm:text-base">₹{unitPrice}</span>
      <span class="text-xs sm:text-sm">/ {unit}</span>
      {#if discount}
        <span class="text-[#848484] text-xs sm:text-sm line-through">₹{MRP}</span>
      {/if}
    </div>
    
    {#if !isOutOfStock}
      <div class="flex flex-wrap items-center justify-between gap-2 mt-1">
        <div class="flex items-center gap-1 min-w-0">
          <span class="text-[#848484] text-xs sm:text-sm">Total :</span>
          {#if selectedQty !== ' '}
            <span class="text-[#30363C] font-semibold text-sm sm:text-base">₹{totalAmount}</span>
          {/if}
        </div>
        <div class="flex items-center gap-2 min-w-14" on:click|stopPropagation>
          <span class="text-xs text-gray-600">Qty</span>
          <Select.Root
            type="single"
            name={`qty-${id}`}
            bind:value={selectedQty}
            on:open={() => handleSelectOpen()}
            onValueChange={(value) => handleQtyChange(value)}
            open={$openSelectId === id.toString()}
            disabled={isOutOfStock}
          >
            <Select.Trigger class="flex items-center justify-between w-21 h-8 text-xs font-semibold sm:w-19 sm:h-9 sm:text-base {isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}">
              <span>
                {selectedQty === '0' || selectedQty === ' ' ? '' : selectedQty}
              </span>
            </Select.Trigger>
            <Select.Content class="z-[30] !min-w-14 max-h-32">
              <Select.Group class="">
                {#each qtyOptions as qty (qty.value)}
                  <Select.Item value={qty.value} label={qty.label}>
                    {qty.label}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    {/if}
  </div>
  
  {#if isOutOfStock}
    <div class="absolute inset-0 bg-black/40 flex justify-center items-center text-white text-lg font-medium">
      Out of Stock
    </div>
  {/if}
</div>