function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.isCartUpdating = false;

    this.addEventListener(
      "keyup",
      (evt) => evt.code === "Escape" && this.close()
    );
    this.querySelector("#CartDrawer-Overlay").addEventListener(
      "click",
      this.close.bind(this)
    );
    this.setHeaderCartIconAccessibility();
    this.cartDrawer = this.querySelector(".drawer__inner");
    this.cartDrawer.addEventListener(
      "click",
      this.handleCartDrawerClick.bind(this)
    );
    this.updateCartDebounced = debounce(this.updateCart.bind(this), 500);
    this.initializeUpsellButtons(); // Ensure upsell buttons are initialized at the start
    this.initializeVariantSelectors();
  }

  // Ensure upsell buttons are initialized on cart drawer open and update
  initializeUpsellButtons() {
    console.log("initialize upsell buttons...");

    var upsellAddButtons = this.querySelectorAll(".upsell-add-button");

    upsellAddButtons.forEach((button) => {
      button.removeEventListener("click", this.handleUpsellButtonClick);
      button.addEventListener("click", this.handleUpsellButtonClick.bind(this));
    });
  }

  initializeVariantSelectors() {
    const variantSelectors = this.querySelectorAll('.upsell-product__variant-selector');
    
    variantSelectors.forEach(selector => {
      selector.removeEventListener('change', this.handleVariantChange);
      selector.addEventListener('change', this.handleVariantChange.bind(this));
    });
  }

  handleVariantChange(event) {
    const selector = event.target;
    const productId = selector.getAttribute('data-product-id');
    const selectedOption = selector.options[selector.selectedIndex];
    const productContainer = selector.closest('.upsell-product');
    const productImage = productContainer.querySelector('.upsell-product-image');

    const imageUrl = selectedOption.getAttribute('data-image-url');
    const defaultImage = productImage.getAttribute('data-default-image'); // Get the default image

    // Check if the imageUrl is not empty and does not contain 'no-image'
    if (imageUrl && !imageUrl.includes('no-image')) {
        productImage.src = imageUrl;
    } else {
        productImage.src = defaultImage;
    }





    
    // Update the add button or checkbox with the new variant ID
    const addButton = productContainer.querySelector('.upsell-add-button');
    const checkbox = productContainer.querySelector('.upsell-checkbox');
    
    if (addButton) {
      addButton.setAttribute('data-product-id', selector.value);
    }
    
    if (checkbox) {
      checkbox.setAttribute('data-product-id', selector.value);
      checkbox.id = `upsell-product-${selector.value}`;
    }
  }

  // Updated handleUpsellButtonClick method to call addProductToCart with isUpsell flag
  handleUpsellButtonClick(event) {
    event.stopPropagation();

    var button = event.target;
    var productId = button.getAttribute("data-product-id");
    var variantSelector = button
      .closest(".upsell-product")
      .querySelector(".upsell-product__variant-selector");
    var variantId = variantSelector ? variantSelector.value : null;

    if (!productId) {
      console.error("Product ID is undefined");
      return;
    }

    this.addProductToCart(productId, variantId, true);
  }

  handleCartDrawerClick(event) {
    console.log("handleCartDrawerClick");

    const quantityButton = event.target.closest(".quantity__button");
    const removeButton = event.target.closest(".cart-remove-button");

    if (quantityButton || removeButton) {
      setTimeout(() => {
        this.initializeUpsellButtons();
        this.initializeVariantSelectors();
      }, 1000);
    }
  }

  handleUpsellChange(event) {
    var checkbox = event.target;
    var productId = checkbox.getAttribute("data-product-id");
    var variantSelector = checkbox
      .closest(".upsell-product")
      .querySelector(".upsell-product__variant-selector");
    var variantId = variantSelector ? variantSelector.value : null;

    if (!productId) {
      console.error("Product ID is undefined");
      return;
    }

    if (checkbox.checked) {
      this.addProductToCart(productId, variantId);
    } else {
      this.removeProductFromCart(productId);
    }
  }

  updateCart() {
    this.isCartUpdating = true;
    fetch(`${routes.cart_url}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.text();
      })
      .then((cartDrawerHtml) => {
        const cartDrawerFragment = document.createElement("div");
        cartDrawerFragment.innerHTML = cartDrawerHtml;

        const sectionsToReplace = this.getSectionsToRender();

        sectionsToReplace.forEach((section) => {
          const sectionElement = document.querySelector(section.selector);
          const newSectionElement = cartDrawerFragment.querySelector(
            section.selector
          );

          if (sectionElement && newSectionElement) {
            sectionElement.innerHTML = newSectionElement.innerHTML;
          } else {
            console.warn(
              `Section element not found for selector: ${section.selector}`
            );
          }
        });

        // Update the subtotal specifically
        const cartFooterElement = document.querySelector(
          ".cart-drawer__footer"
        );
        const newCartFooterElement = cartDrawerFragment.querySelector(
          ".cart-drawer__footer"
        );

        if (cartFooterElement && newCartFooterElement) {
          cartFooterElement.innerHTML = newCartFooterElement.innerHTML;
        } else {
          console.warn("Cart footer element not found");
        }

        this.initializeUpsellButtons();
        this.initializeVariantSelectors();
      })
      .catch((error) => {
        console.error("Error updating cart:", error);
      })
      .finally(() => {
        this.isCartUpdating = false;
      });
  }

  addProductToCart(productId, variantId, isUpsell = false) {
    if (!productId) {
      console.error("Product ID is undefined");
      return;
    }

    if (this.isCartUpdating) {
      console.warn("Cart is currently being updated. Please try again later.");
      return;
    }

    const itemData = {
      items: [
        {
          id: variantId ? variantId : productId,
          quantity: 1,
        },
      ],
    };

    fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to add product to cart: " + response.statusText
          );
        }
        return response.json();
      })
      .then((data) => {
        this.dispatchEvent(new CustomEvent("cartUpdated", { bubbles: true }));
        if (isUpsell) {
          this.updateCart(); // Only update cart when an upsell is added
        }
      })
      .catch((error) => {
        console.error("Error adding product to cart:", error);
      });
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector("#cart-icon-bubble");
    cartLink.setAttribute("role", "button");
    cartLink.setAttribute("aria-haspopup", "dialog");
    cartLink.addEventListener("click", (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener("keydown", (event) => {
      if (event.code.toUpperCase() === "SPACE") {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute("role"))
      this.setSummaryAccessibility(cartDrawerNote);
    setTimeout(() => {
      this.classList.add("animate", "active");
    });

    this.addEventListener(
      "transitionend",
      () => {
        const containerToTrapFocusOn = this.classList.contains("is-empty")
          ? this.querySelector(".drawer__inner-empty")
          : document.querySelector("#CartDrawer");
        const focusElement =
          this.querySelector(".drawer__inner") ||
          this.querySelector(".drawer__close");
        trapFocus(containerToTrapFocusOn, focusElement);
        this.initializeUpsellButtons();
        this.initializeVariantSelectors();
      },
      { once: true }
    );

    document.body.classList.add("overflow-hidden");
  }

  close() {
    this.classList.remove("active");
    removeTrapFocus(this.activeElement);
    document.body.classList.remove("overflow-hidden");
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute("role", "button");
    cartDrawerNote.setAttribute("aria-expanded", "false");

    if (cartDrawerNote.nextElementSibling.getAttribute("id")) {
      cartDrawerNote.setAttribute(
        "aria-controls",
        cartDrawerNote.nextElementSibling.id
      );
    }

    cartDrawerNote.addEventListener("click", (event) => {
      event.currentTarget.setAttribute(
        "aria-expanded",
        !event.currentTarget.closest("details").hasAttribute("open")
      );
    });

    cartDrawerNote.parentElement.addEventListener("keyup", onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector(".drawer__inner").classList.contains("is-empty") &&
      this.querySelector(".drawer__inner").classList.remove("is-empty");
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
    });

    setTimeout(() => {
      this.querySelector("#CartDrawer-Overlay").addEventListener(
        "click",
        this.close.bind(this)
      );
      this.open();
    });

    this.dispatchEvent(new CustomEvent("cartUpdated", { bubbles: true }));
    this.initializeUpsellButtons();
    this.initializeVariantSelectors();
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: "cart-drawer",
        selector: ".drawer__inner",
      },
      {
        id: "cart-drawer",
        selector: ".cart-drawer__footer",
      },
    ];
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define("cart-drawer", CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: "CartDrawer",
        section: "cart-drawer",
        selector: ".drawer__inner",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
    ];
  }
}

customElements.define("cart-drawer-items", CartDrawerItems);

// class CartDrawer extends HTMLElement {
//   constructor() {
//     super();

//     this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
//     this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
//     this.setHeaderCartIconAccessibility();
//   }

//   setHeaderCartIconAccessibility() {
//     const cartLink = document.querySelector('#cart-icon-bubble');
//     cartLink.setAttribute('role', 'button');
//     cartLink.setAttribute('aria-haspopup', 'dialog');
//     cartLink.addEventListener('click', (event) => {
//       event.preventDefault();
//       this.open(cartLink);
//     });
//     cartLink.addEventListener('keydown', (event) => {
//       if (event.code.toUpperCase() === 'SPACE') {
//         event.preventDefault();
//         this.open(cartLink);
//       }
//     });
//   }

//   open(triggeredBy) {
//     if (triggeredBy) this.setActiveElement(triggeredBy);
//     const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
//     if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
//     // here the animation doesn't seem to always get triggered. A timeout seem to help
//     setTimeout(() => {
//       this.classList.add('animate', 'active');
//     });

//     this.addEventListener(
//       'transitionend',
//       () => {
//         const containerToTrapFocusOn = this.classList.contains('is-empty')
//           ? this.querySelector('.drawer__inner-empty')
//           : document.getElementById('CartDrawer');
//         const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
//         trapFocus(containerToTrapFocusOn, focusElement);
//       },
//       { once: true }
//     );

//     document.body.classList.add('overflow-hidden');
//   }

//   close() {
//     this.classList.remove('active');
//     removeTrapFocus(this.activeElement);
//     document.body.classList.remove('overflow-hidden');
//   }

//   setSummaryAccessibility(cartDrawerNote) {
//     cartDrawerNote.setAttribute('role', 'button');
//     cartDrawerNote.setAttribute('aria-expanded', 'false');

//     if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
//       cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
//     }

//     cartDrawerNote.addEventListener('click', (event) => {
//       event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
//     });

//     cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
//   }

//   renderContents(parsedState) {
//     this.querySelector('.drawer__inner').classList.contains('is-empty') &&
//       this.querySelector('.drawer__inner').classList.remove('is-empty');
//     this.productId = parsedState.id;
//     this.getSectionsToRender().forEach((section) => {
//       const sectionElement = section.selector
//         ? document.querySelector(section.selector)
//         : document.getElementById(section.id);
//       sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
//     });

//     setTimeout(() => {
//       this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
//       this.open();
//     });
//   }

//   getSectionInnerHTML(html, selector = '.shopify-section') {
//     return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
//   }

//   getSectionsToRender() {
//     return [
//       {
//         id: 'cart-drawer',
//         selector: '#CartDrawer',
//       },
//       {
//         id: 'cart-icon-bubble',
//       },
//     ];
//   }

//   getSectionDOM(html, selector = '.shopify-section') {
//     return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
//   }

//   setActiveElement(element) {
//     this.activeElement = element;
//   }
// }

// customElements.define('cart-drawer', CartDrawer);

// class CartDrawerItems extends CartItems {
//   getSectionsToRender() {
//     return [
//       {
//         id: 'CartDrawer',
//         section: 'cart-drawer',
//         selector: '.drawer__inner',
//       },
//       {
//         id: 'cart-icon-bubble',
//         section: 'cart-icon-bubble',
//         selector: '.shopify-section',
//       },
//     ];
//   }
// }

// customElements.define('cart-drawer-items', CartDrawerItems);
