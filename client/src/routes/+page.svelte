<script lang="ts">
	import { _axios } from "$lib/_axios";
	import { createQuery } from "@tanstack/svelte-query"
	import Hero from "$lib/components/pages/home/hero.svelte";
	import NewProducts from "$lib/components/pages/home/newProducts.svelte";
	import Footer from "$lib/components/footer.svelte";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { toast } from "svelte-sonner";
	import { onMessageListener } from "$lib/firebase/firebase";
	import { requestForToken } from "$lib/firebase";
	import { writableGlobalStore } from "$lib/stores/global-store";
	onMount(async () => {
		if (typeof window === 'undefined') return;

		const { onMessage, getMessaging } = await import('firebase/messaging');
		const {firebaseApp } = await import('$lib/firebase/firebase');

		if (!firebaseApp) return;
		const res = await requestForToken();
		const messaging = getMessaging(firebaseApp);

		// onMessage(messaging, (payload) => {
		// 	console.log('Foreground message:', payload);
		// 	toast(payload.notification?.title);
		// });
		onMessageListener().then((payload: any) => {
			// console.log('Message received in foreground:', payload);
			$writableGlobalStore.hasNoti=true;
		});

	});
	
</script>

<div >
<Hero />
<!-- <Quote /> -->
<!-- <OfferProducts /> -->
<!-- <NewProducts /> -->
<!-- <DemandBox /> -->
<NewProducts />
<Footer />
</div>

