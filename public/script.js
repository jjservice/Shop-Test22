const stripe = Stripe('pk_test_51QTSb2LPa32ZluPp57bSF7ObgsE3CMMCcM1eSbcuMBDrhRuZV6uYL8EqqpLLiGwIAbEg8crJEYfXBDyBM5fZM5Q600fBMTS2Rt');

// Initialize cart from localStorage if it exists, otherwise an empty array
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Function to update the cart display
function updateCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  cartItemsContainer.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    // Validate item properties to prevent displaying undefined values
    if (!item.id || !item.name || !item.image || isNaN(item.price) || isNaN(item.quantity)) {
      console.error("Invalid item in cart:", item);
      return; // Skip rendering this item if it's invalid
    }

    const cartItem = document.createElement('div');
    cartItem.classList.add('cart-item');
    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-image">
      <span>${item.name} - $${item.price}</span>
      
      <!-- Quantity input field -->
      <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-product-id="${item.id}">
      
      <span class="item-total-price">Total: $${(item.price * item.quantity).toFixed(2)}</span>
      
      <!-- Remove button -->
      <button class="remove-item" data-product-id="${item.id}">Remove</button>
    `;

    // Add event listener for the quantity input
    const quantityInput = cartItem.querySelector('.quantity-input');
    quantityInput.addEventListener('input', (e) => {
      const newQuantity = parseInt(e.target.value);
      if (newQuantity > 0) {
        updateItemQuantity(item.id, newQuantity);
      } else {
        // If invalid input (quantity less than 1), reset to the current quantity
        e.target.value = item.quantity;
      }
    });

    // Add to cart container
    cartItemsContainer.appendChild(cartItem);
    total += parseFloat(item.price) * item.quantity; // Update total based on quantity
  });

  // Update total price
  document.getElementById('cart-total').textContent = `Total: $${total.toFixed(2)}`;

  // Show or hide the checkout button based on cart contents
  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.style.display = cart.length > 0 ? 'inline-block' : 'none';
}

// Function to update item quantity in the cart
function updateItemQuantity(productId, newQuantity) {
  const itemIndex = cart.findIndex(item => item.id === productId);
  if (itemIndex !== -1) {
    cart[itemIndex].quantity = newQuantity;
    updateCart(); // Re-render the cart after updating quantity
  }
}


// Function to show a message when an item is added
function showAddToCartMessage(item) {
  alert(`Added ${item.quantity} x ${item.name} to your cart!`);
}

// Handle the 'Add to Cart' button click
document.querySelectorAll('.buy-now').forEach(button => {
  button.addEventListener('click', (event) => {
    const productId = event.target.getAttribute('data-product-id');
    const productName = event.target.getAttribute('data-name');
    const price = parseFloat(event.target.getAttribute('data-price'));
    const image = event.target.closest('.product').querySelector('img').src; // Get the product image URL
    const quantity = parseInt(event.target.closest('.product').querySelector('.quantity-input').value);
    const quantityInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);

    const maxQuantity = quantityInput.getAttribute('max');
    const currentQuantity = quantityInput.value;

    // Check if the quantity exceeds the max limit
    if (parseInt(currentQuantity) > parseInt(maxQuantity)) {
      alert('The quantity exceeds the maximum allowed, product may be refunded!');
      return;  // Prevent adding to the cart
    }

    // Check if quantity is a valid number
    if (isNaN(quantity) || quantity <= 0) {
      alert("Please select a valid quantity.");
      return;
    }

    // Ensure all product data is valid before adding to the cart
    if (!productId || !productName || isNaN(price) || !image || isNaN(quantity) || quantity <= 0) {
      alert("Missing or invalid product data.");
      return;
    }

    // Add product to cart with image and quantity
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    if (existingItemIndex === -1) {
      // Item is not already in the cart, add it
      cart.push({ id: productId, name: productName, price: price, image: image, quantity: quantity });
    } else {
      // Item is already in the cart, update quantity
      cart[existingItemIndex].quantity += quantity;
    }

    // Save the updated cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));

    // Show a message when item is added
    showAddToCartMessage({ name: productName, quantity });

    // Update the cart display
    updateCart();
  });
});

// Handle 'Remove' button click from cart
document.getElementById('cart-items').addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-item')) {
    const productId = event.target.getAttribute('data-product-id');
    
    // Remove item from cart
    cart = cart.filter(item => item.id !== productId);

    // Save the updated cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));

    // Update the cart display
    updateCart();
  }
});

// Function to clear cart after successful checkout
function clearCart() {
  cart = []; // Clear the local cart array
  localStorage.removeItem('cart'); // Remove the cart from localStorage
  updateCart(); // Update the cart display (should show empty cart)
}

// Simulate successful checkout (this would usually be triggered by a Stripe webhook or success page handler)
if (window.location.pathname === '/success') {
  clearCart(); // Clear the cart when the success page is loaded
  alert("Thank you for your purchase! Your cart has been cleared.");
  // Optionally, redirect to another page, e.g., home page
  window.location.href = './index.html'; // Redirect to home page after success
}

// Initialize the cart display on page load
updateCart();

// Handle the 'Proceed to Checkout' button click
document.getElementById('checkout-btn').addEventListener('click', async () => {
  // Send request to the server to create the checkout session with the cart items
  const response = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart })
  });

  const session = await response.json();

  // Redirect to Stripe Checkout
  const { error } = await stripe.redirectToCheckout({ sessionId: session.id });
  if (error) {
    console.error('Error:', error);
  }
});
