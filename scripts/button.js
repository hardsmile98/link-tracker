(function () {
    const TRACKING_DOMAIN = 'https://tracking.ghatgp2o.beget.tech';
  
    function buildTrackingUrl() {
      const currentUrl = new URL(window.location.href);
  
      const trackingUrl = new URL(`${TRACKING_DOMAIN}/api/click`);
  
      currentUrl.searchParams.forEach((value, key) => {
        trackingUrl.searchParams.set(key, value);
      });
  
      return trackingUrl.toString();
    }
  
    function patchLinks() {
      const links = document.querySelectorAll('a[href]');

      const buttons = document.querySelectorAll('button[type="button"]');
  
      const trackingUrl = buildTrackingUrl();
      
      [...links, ...buttons].forEach(element => {
        const isLink = element.matches('a[href]');

        if (isLink) {
          element.setAttribute('href', trackingUrl);
        }
        else {
          element.setAttribute('data-target-url', trackingUrl);

          element.addEventListener('click', (event) => {
            event.preventDefault();
            window.open(buildTrackingUrl(), '_blank');
          });
        }
      });
    }
  
    document.addEventListener('DOMContentLoaded', patchLinks);
  })();