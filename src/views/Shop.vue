<!-- Shop -->
<template>
  <v-container fluid>
    <v-row class="shop-header">
      <v-col>
        <h1>Our Products</h1>
        <p>Discover our delicious canned pineapple products</p>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card class="cart-summary">
          <v-card-title>Cart Summary</v-card-title>
          <v-card-text>
            <div v-if="cart.length === 0" class="empty-cart">
              Your cart is empty
            </div>
            <div v-else class="cart-items">
              <div v-for="(item, index) in cart" :key="index" class="cart-item">
                <span>{{ item.name }} × {{ item.quantity }}</span>
                <span>$ {{ (item.price * item.quantity).toFixed(2) }}</span>
              </div>
              <div class="cart-total">
                <strong>Total:</strong>
                <strong>$ {{ cartTotal.toFixed(2) }}</strong>
              </div>
            </div>
            <v-btn
              color="primary"
              :disabled="cart.length === 0"
              @click="checkout"
            >
              Checkout
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="products-grid">
      <v-col
        v-for="product in products"
        :key="product.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="product-card">
          <v-img
            :src="product.image"
            height="200px"
            cover
          ></v-img>
          <v-card-title>{{ product.name }}</v-card-title>
          <v-card-text>
            <p class="price">$ {{ product.price.toFixed(2) }}</p>
            <p>{{ product.description }}</p>
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="primary"
              @click="addToCart(product)"
            >
              Add to Cart
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'ShopView',
  data() {
    return {
      products: [
        {
          id: 1,
          name: 'Premium Canned Pineapple',
          price: 4.99,
          description: 'Premium quality canned pineapple slices',
          image: 'https://via.placeholder.com/300x200/FFD700/000000?text=Product+1',
        },
        {
          id: 2,
          name: 'Organic Pineapple Chunks',
          price: 5.99,
          description: 'Organically grown pineapple chunks',
          image: 'https://via.placeholder.com/300x200/FFA500/000000?text=Product+2',
        },
        {
          id: 3,
          name: 'Pineapple Rings',
          price: 4.49,
          description: 'Perfectly sliced pineapple rings',
          image: 'https://via.placeholder.com/300x200/FF4500/000000?text=Product+3',
        },
        {
          id: 4,
          name: 'Pineapple Juice',
          price: 3.99,
          description: 'Freshly squeezed pineapple juice',
          image: 'https://via.placeholder.com/300x200/FF6347/000000?text=Product+4',
        },
      ],
      cart: []
    };
  },
  computed: {
    cartTotal() {
      return this.cart.reduce((total, item) => 
        total + (item.price * item.quantity), 0);
    }
  },
  methods: {
    addToCart(product) {
      const existingItem = this.cart.find(item => item.id === product.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.cart.push({
          ...product,
          quantity: 1
        });
      }
    },
    checkout() {
      // TODO: Implement checkout functionality
      alert('Thank you for your purchase! Your order has been placed.');
      this.cart = [];
    }
  }
};
</script>

<style scoped>
.shop-header {
  padding: 40px 0;
  text-align: center;
}

.shop-header h1 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 1rem;
}

.shop-header p {
  color: #666;
  font-size: 1.1rem;
}

.cart-summary {
  margin-bottom: 30px;
}

.cart-items {
  margin-bottom: 20px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.cart-total {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  font-size: 1.2rem;
}

.empty-cart {
  text-align: center;
  color: #666;
  padding: 20px;
}

.products-grid {
  padding: 20px 0;
}

.product-card {
  margin-bottom: 20px;
  transition: transform 0.2s;
}

.product-card:hover {
  transform: translateY(-5px);
}

.product-card .price {
  font-size: 1.2rem;
  font-weight: bold;
  color: #FF4500;
  margin-bottom: 10px;
}

@media (max-width: 960px) {
  .shop-header h1 {
    font-size: 2rem;
  }
  
  .products-grid {
    padding: 10px 0;
  }
}
</style>