<script lang="ts">
  import Footer from '$lib/components/footer.svelte';
  import { onMount, onDestroy } from 'svelte';

  let map: L.Map | null = null;
  let mapContainer: HTMLDivElement;
  let L: typeof import('leaflet');

  // Gallery state
  let selectedImage = 0;
  let showModal = false;

  // Gallery images
  const galleryImages = [
    {
      id: 1,
      src: "/images/5.jpeg",
      alt: "Fireworks Shop Interior",
      title: "Our Store Interior"
    },
    {
      id: 2,
      src: "/images/1.jpeg",
      alt: "Fireworks Display",
      title: "Premium Fireworks Collection"
    },
    {
      id: 3,
      src: "/images/2.jpeg",
      alt: "Sparklers Collection",
      title: "Sparklers & Ground Items"
    },
    {
      id: 4,
      src: "/images/3.jpeg",
      alt: "Aerial Shells",
      title: "Aerial Shells & Fountains"
    },
    {
      id: 5,
      src: "/images/4.jpeg",
      alt: "Celebration Packages",
      title: "Festival Celebration Packages"
    },
    {
      id: 6,
      src: "/images/6.jpeg",
      alt: "Safety Equipment",
      title: "Safety Equipment & Accessories"
    }
  ];


  onMount(async () => {
    // Dynamically import Leaflet only on client side
    L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');

    // Fix default icon URLs for Leaflet markers
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
    const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
    L.Marker.prototype.options.icon = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    if (!mapContainer) return;

    map = L.map(mapContainer).setView([8.183538566165574, 77.40885283254259], 13);

    L.tileLayer('http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 19,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps',
    }).addTo(map);

    L.marker([8.183538566165574, 77.40885283254259])
      .addTo(map)
      .bindPopup('Store Location')
      .openPopup();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
    }
  });

  function openModal(index: number) {
    selectedImage = index;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  function nextImage() {
    selectedImage = (selectedImage + 1) % galleryImages.length;
  }

  function prevImage() {
    selectedImage = (selectedImage - 1 + galleryImages.length) % galleryImages.length;
  }
</script>

<style>
  .parallax-bg {
    background-attachment: fixed;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
  }
  
  .team-card:hover .team-image {
    transform: scale(1.05);
  }
  
  .timeline-item::before {
    content: '';
    position: absolute;
    left: -38px;
    top: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #f97316;
    border: 4px solid #fff;
  }
  
  .timeline::before {
    content: '';
    position: absolute;
    left: 35px;
    top: 0;
    height: 100%;
    width: 2px;
    background: #e5e7eb;
  }
</style>

<div class="bg-white">
  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <!-- About Section -->
    <div class="grid md:grid-cols-2 gap-12 items-center mb-20">
      <div>
        <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
     About Us
        </h2>
        <p class="text-lg text-gray-600 mb-6">
          Founded in 2015, Indian Crackers has grown from a small local shop to one of the region's most trusted fireworks suppliers. Our passion for creating unforgettable moments drives everything we do.
        </p>
        <p class="text-lg text-gray-600 mb-8">
          We work directly with licensed manufacturers to deliver authentic, high-quality fireworks at competitive prices, while upholding the highest safety standards in the industry.
        </p>
      </div>
      <div class="relative rounded-xl overflow-hidden shadow-2xl h-96">
        <img 
          src="/images/4.jpeg" 
          alt="Our store" 
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
          <div>
            <h3 class="text-white text-2xl font-bold mb-2">Our Flagship Store</h3>
            <p class="text-gray-200">Visit us for an immersive fireworks experience</p>
          </div>
        </div>
      </div>
    </div>


    <!-- Gallery Section -->
    <div class="mb-20">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
        Our Work in Action
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        {#each galleryImages as image, index (image.id)}
          <div 
            class="relative group overflow-hidden rounded-lg cursor-pointer h-48 md:h-64"
            on:click={() => openModal(index)}
          >
            <img
              src={image.src}
              alt={image.alt}
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
              </svg>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Map Section -->
    <div class="mb-20">
      <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-8">
        Visit Our Store
      </h2>
      <p class="text-center text-gray-600 max-w-2xl mx-auto mb-12">
        Come experience our fireworks collection in person at our flagship store. Our knowledgeable staff will help you find the perfect products for your celebration.
      </p>
      <div class="rounded-2xl overflow-hidden shadow-xl h-96 !z-20">
        <div id="map" bind:this={mapContainer} class="w-full !z-20 h-full"></div>
      </div>
    </div>

  </div>
</div>

<!-- Modal for Gallery -->
{#if showModal}
  <div class="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" on:click={closeModal}>
    <div class="relative max-w-4xl w-full" on:click|stopPropagation>
      <button class="absolute top-4 right-4 text-white hover:text-gray-300 z-10" on:click={closeModal}>
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <button class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10" on:click|stopPropagation={prevImage}>
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      <button class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10" on:click|stopPropagation={nextImage}>
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>

      <img
        src={galleryImages[selectedImage].src}
        alt={galleryImages[selectedImage].alt}
        class="w-full h-auto max-h-[80vh] object-contain rounded-lg"
      />

      <div class="mt-4 text-center text-white">
        <h3 class="text-xl font-semibold">{galleryImages[selectedImage].title}</h3>
        <p class="text-gray-300">{galleryImages[selectedImage].alt}</p>
      </div>

      <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full">
        {selectedImage + 1} / {galleryImages.length}
      </div>
    </div>
  </div>
{/if}

<Footer />