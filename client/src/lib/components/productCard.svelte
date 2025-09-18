<script lang="ts">
  import { goto } from '$app/navigation';
  import { imgUrl } from '$lib/config';
  import { _axios } from '$lib/_axios';
  import { toast } from 'svelte-sonner';
  import { writableGlobalStore } from '$lib/stores/global-store';
  import { queryClient } from '$lib/query-client';
  import { createMutation } from '@tanstack/svelte-query';

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
  let selectedQty: any = 1;
  let showQtyDropdown = false;
  const minQty = 1;
  const maxQty = 9999;

  // Price calculations
  $: unitPrice = Math.round(MRP - (MRP * (discount || 0) / 100));
  $: totalAmount = unitPrice * selectedQty;

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
  async function handleQtyChange(qty) {
    // If 'Qty' label is selected, remove from cart
    if (qty === 'Qty') {
      // Only remove from cart if product is already in cart
      if (selectedQty > 1) {
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
            selectedQty = "Qty";
            toast.success('Product removed from cart');
            queryClient.invalidateQueries(['cart']);
          } else {
            toast.error(response.data.message || 'Failed to remove from cart');
          }
        } catch (err) {
          toast.error('Error removing from cart');
        }
      }
      // If not in cart, just close dropdown and do nothing
      return;
    }
    // Otherwise, add/update cart
    if (qty < minQty) qty = minQty;
    if (qty > maxQty) qty = maxQty;
    selectedQty = qty;
    try {
      await $updateCartMutation.mutateAsync(selectedQty);
    } catch (err) {
      console.error("Cart update failed", err);
    }
  }
</script>

<!-- ✅ Mobile View (Qty on right side) -->
<div class="sm:hidden w-full bg-white border rounded-lg shadow p-4 flex items-start gap-4 cursor-pointer" on:click={() => handleClick()}>
  <!-- Left side (Product Image) -->
  <div class="flex-shrink-0 w-20">
    <img
      src={imgUrl + image}
      alt={name}
      class="w-20 h-20 object-contain rounded"
    />
  </div>

  <!-- Right side (Info) -->
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

    <!-- Qty Dropdown -->
    <div class="absolute bottom-0 right-0 mb-2 mr-2 flex items-center" on:click|stopPropagation>
      <span class="text-xs text-gray-600 mr-1">Qty</span>
      <div class="relative">
        <button type="button" class="w-14 text-center text-base font-semibold border border-gray-300 rounded bg-gray-50 focus:outline-none" on:click={() => showQtyDropdown = !showQtyDropdown}>
          {selectedQty === null || selectedQty === undefined || selectedQty === 1 ? 'Qty' : selectedQty}
        </button>
              {#if showQtyDropdown}
                <div class="absolute z-[99999] left-0 mt-1 w-20 bg-white border rounded shadow-lg max-h-48 overflow-y-auto pointer-events-auto">
                  <div class="px-3 py-1 hover:bg-gray-100 cursor-pointer text-center font-semibold" on:click={() => { handleQtyChange('Qty'); showQtyDropdown = false; }}>Qty</div>
                  {#each Array(100).fill(0).map((_, i) => i + 1) as qty}
                    <div class="px-3 py-1 hover:bg-gray-100 cursor-pointer text-center" on:click={() => { selectedQty = qty; showQtyDropdown = false; handleQtyChange(qty); }}>
                      {qty}
                    </div>
                  {/each}
                </div>
              {/if}
      </div>
    </div>

  </div>
</div>

<!-- ✅ Tablet + Desktop View (your original card) -->
<div
  class="hidden sm:block relative group bg-white border rounded-xl shadow-md overflow-hidden transition-transform duration-200 hover:scale-[1.02] 
         w-full sm:w-44 md:w-56 lg:w-64"
  style="cursor: pointer;"
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
  <!-- Favorite -->
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

  <!-- Image -->
  <div class="relative h-40 sm:h-44 md:h-48 lg:h-52 flex justify-center items-center bg-gray-50">
    <img
      class="object-contain max-h-full max-w-full"
      src={imgUrl + image}
      alt={name}
      loading="lazy"
    />
  </div>

  <!-- Details -->
  <div class="px-3 md:px-4 py-2 border-t shadow-inner relative flex flex-col gap-1">
    <h3
      class="font-medium text-sm sm:text-base text-[#222222] capitalize truncate"
      title={name}
    >
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
      <div class="flex items-center gap-2 min-w-[110px]" on:click|stopPropagation>
  <span class="text-xs text-gray-600">Qty</span>
  <div class="relative">
        <button type="button" class="w-14 text-center text-base font-semibold border border-gray-300 rounded bg-gray-50 focus:outline-none" on:click={() => showQtyDropdown = !showQtyDropdown}>
          {selectedQty === null || selectedQty === undefined || selectedQty === 1 ? 'Qty' : selectedQty}
        </button>
        {#if showQtyDropdown}
          <div class="absolute z-999 left-0 mt-1 w-20 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
            <div class="px-3 py-1 hover:bg-gray-100 cursor-pointer text-center font-semibold" on:click={() => { handleQtyChange('Qty'); showQtyDropdown = false; }}>Qty</div>
            {#each Array(100).fill(0).map((_, i) => i + 1) as qty}
              <div class="px-3 py-1 hover:bg-gray-100 cursor-pointer text-center" on:click={() => { selectedQty = qty; showQtyDropdown = false; handleQtyChange(qty); }}>
                {qty}
              </div>
            {/each}
          </div>
        {/if}
      </div>
</div>

    </div>
  </div>

  <!-- Out of Stock -->
  {#if !available}
    <div class="absolute inset-0 bg-black/40 flex justify-center items-center text-white text-lg font-medium">
      Out of Stock
    </div>
  {/if}
</div>
