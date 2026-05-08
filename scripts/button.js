(function () {
  const SCRIPT_ID = "tracking-script";

  function getReferrer() {
    const referrerUrl = new URL(window.location.href);
    return `${referrerUrl.origin}${referrerUrl.pathname}`;
  }

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;

    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) return parts.pop().split(';').shift();

    return null;
  };

  function getScriptConfig() {
    const script = document.getElementById(SCRIPT_ID) || document.currentScript;
    if (!script) {
      console.error("Tracking script not found");
      throw new Error("Tracking script not found");
    }

    return {
      scriptSubid: script.dataset.subid,
      scriptTargetUrl: script.dataset.targetUrl,
      scriptTargetTtp: script.dataset.targetTtp,
      scriptTargetFbp: script.dataset.targetFbp,
    };
  }

  function buildTrackingUrl(config) {
    const currentUrl = new URL(window.location.href);

    const trackingUrl = new URL(config.scriptTargetUrl);

    currentUrl.searchParams.forEach((value, key) => {
      trackingUrl.searchParams.set(key, value);
    });

    if (config.scriptSubid) {
      trackingUrl.searchParams.set("subid", config.scriptSubid);
    }

    if (config.scriptTargetTtp) {
      trackingUrl.searchParams.set("ttpixelid", config.scriptTargetTtp);

      const _ttp = getCookie("_ttp");

      if (_ttp) {
        trackingUrl.searchParams.set("_ttp", _ttp);
      }
    }

    if (config.scriptTargetFbp) {
      trackingUrl.searchParams.set("fbpixelid", config.scriptTargetFbp);
    }

    trackingUrl.searchParams.set("referrer", getReferrer());

    return trackingUrl.toString();
  }

  function patchLinks() {
    const config = getScriptConfig();

    const links = document.querySelectorAll("a[href]");

    const buttons = document.querySelectorAll('button[type="button"]');

    const trackingUrl = buildTrackingUrl(config);

    [...links, ...buttons].forEach((element) => {
      const isLink = element.matches("a[href]");

      if (isLink) {
        element.setAttribute("href", trackingUrl);
      } else {
        element.setAttribute("data-target-url", trackingUrl);

        element.addEventListener("click", (event) => {
          event.preventDefault();
          window.open(trackingUrl, "_blank");
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", patchLinks);
  } else {
    patchLinks();
  }
})();
