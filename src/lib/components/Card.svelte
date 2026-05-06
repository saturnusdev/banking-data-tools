<script>
  export let title;
  export let image;
</script>

<!-- 
  Adding 'cursor-pointer', 'transition', and 'hover' classes for feedback.
  We use a 'button' for accessibility or forward the click from a div.
-->
<button 
  type="button"
  on:click
  class="max-w-sm w-full cursor-pointer text-left overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 transition-transform duration-200 hover:scale-105 hover:shadow-1xl focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <img class="w-full h-48 object-cover" src={image} alt={title} />
  <div class="px-6 py-5 text-center">
    <div class="font-bold text-xl mb-2 text-gray-900 dark:text-white">{title}</div>
  </div>
</button>