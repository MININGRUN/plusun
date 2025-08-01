function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
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
    this.initializeQuantityButtons();
    this.initializeRemoveButtons();
  }

  initializeUpsellButtons() {
    console.log("initializeUpsellButtons");
    var upsellCheckboxes = this.querySelectorAll(".upsell-checkbox");
    upsellCheckboxes.forEach((checkbox) => {
      checkbox.removeEventListener("change", this.handleUpsellChange);
      checkbox.addEventListener("change", this.handleUpsellChange.bind(this));
    });

    var upsellAddButtons = this.querySelectorAll(".upsell-add-button");
    upsellAddButtons.forEach((button) => {
      button.removeEventListener("click", this.handleUpsellButtonClick);
      button.addEventListener("click", this.handleUpsellButtonClick.bind(this));
    });
  }

  initializeQuantityButtons() {
    console.log("initializeQuantityButtons");
    const drawerInner = this.querySelector(".drawer__inner");
    drawerInner.removeEventListener("click", this.handleQuantityButtonClick);
    drawerInner.addEventListener(
      "click",
      this.handleQuantityButtonClick.bind(this)
    );
  }

  initializeRemoveButtons() {
    console.log("initializeRemoveButtons");
    const removeButtons = this.querySelectorAll("cart-remove-button");
    removeButtons.forEach((button) => {
      button.removeEventListener("click", this.handleRemoveButtonClick);
    });

    removeButtons.forEach((button) => {
      button.addEventListener("click", this.handleRemoveButtonClick.bind(this));
    });
  }

  handleUpsellButtonClick(event) {
    console.log("handleUpsellButtonClick");
    event.stopPropagation(); // Add this line to prevent event propagation

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

    this.addProductToCart(productId, variantId);
  }

  handleQuantityButtonClick(event) {
    console.log("handleQuantityButtonClick");
    if (event.target.closest(".quantity__button")) {
      setTimeout(() => {
        this.updateCartFooter();
      }, 500);
    }
  }

  handleRemoveButtonClick(event) {
    if (event.target.closest(".cart-remove-button")) {
      setTimeout(() => {
        this.updateCartFooter();
      }, 500);
    }
  }

  handleUpsellChange(event) {
    console.log("handleUpsellChange");
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

  updateCartDrawer() {
    console.log("updateCartDrawer");
    this.isCartUpdating = true;
    fetch(`${routes.cart_url}`)
      .then((response) => response.text())
      .then((cartDrawerHtml) => {
        const tempElement = document.createElement("div");
        tempElement.innerHTML = cartDrawerHtml;

        const sectionsToReplace = this.getSectionsToRender();
        sectionsToReplace.forEach((section) => {
          const sectionElement = document.querySelector(section.selector);
          const newSectionElement = tempElement.querySelector(section.selector);

          if (sectionElement && newSectionElement) {
            sectionElement.innerHTML = newSectionElement.innerHTML;
          } else {
            console.warn(
              `Section element not found for selector: ${section.selector}`
            );
          }
        });

        this.updateCartFooter();
        this.initializeRemoveButtons();
      })
      .catch((error) => {
        console.error("Error updating cart drawer:", error);
      })
      .finally(() => {
        this.isCartUpdating = false;
      });
  }

  updateCartFooter() {
    console.log("updateCartFooter");
    this.isCartUpdating = true;
    fetch(`${routes.cart_url}`)
      .then((response) => response.text())
      .then((cartDrawerHtml) => {
        const tempElement = document.createElement("div");
        tempElement.innerHTML = cartDrawerHtml;
        const sectionsToReplace = this.getFooterSectionToRender();
        sectionsToReplace.forEach((section) => {
          const sectionElement = document.querySelector(section.selector);
          const newSectionElement = tempElement.querySelector(section.selector);
          if (sectionElement && newSectionElement) {
            sectionElement.innerHTML = newSectionElement.innerHTML;
          } else {
            console.warn(
              `Section element not found for selector: ${section.selector}`
            );
          }
        });
      })
      .catch((error) => {
        console.error("Error updating cart footer:", error);
      })
      .finally(() => {
        this.isCartUpdating = false;
      });
  }

  addProductToCart(productId, variantId) {
    console.log("addProductToCart");
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
        this.updateCartDrawer();
      })
      .catch((error) => {
        console.error("Error adding product to cart:", error);
      });
  }

  setHeaderCartIconAccessibility() {
    console.log("setHeaderCartIconAccessibility");
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
          : document.getElementById("CartDrawer");
        const focusElement =
          this.querySelector(".drawer__inner") ||
          this.querySelector(".drawer__close");
        trapFocus(containerToTrapFocusOn, focusElement);
        this.initializeUpsellButtons();
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
    console.log("setSummaryAccessibility");
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
    console.log("renderContents");
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
      this.initializeQuantityButtons();
      this.initializeRemoveButtons();
      this.initializeUpsellButtons();
    });

    this.dispatchEvent(new CustomEvent("cartUpdated", { bubbles: true }));
    this.updateCartFooter();

    setTimeout(() => {
      this.querySelector("#CartDrawer-Overlay").addEventListener(
        "click",
        this.close.bind(this)
      );
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    console.log("getSectionInnerHTML");
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
    ];
  }

//   getFooterSectionToRender() {
//     return [
//       {
//         id: "cart-footer",
//         selector: ".cart-drawer__footer",
//       },
//     ];
//   }

  getSectionDOM(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector);
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
