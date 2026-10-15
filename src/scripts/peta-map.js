import L from "leaflet";
import "leaflet/dist/leaflet.css";

const GEOJSON_URL = "/data/rumahsakit-cimahi.geojson";
const CIMAHI_CENTER = [-6.8938, 107.5425];
const CIMAHI_ZOOM = 13;


function starMarkup(filled) {
	const cls = filled ? "bkc-star--full" : "bkc-star--empty";
	return `<svg viewBox="0 0 20 20" class="${cls}" stroke-width="1.4"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5z"/></svg>`;
}

function starsMarkup(ratingText) {
	const rating = parseFloat(String(ratingText).replace(",", ".")) || 0;
	const rounded = Math.round(rating);
	let out = "";
	for (let i = 1; i <= 5; i += 1) out += starMarkup(i <= rounded);
	return out;
}

function resolveAsset(path) {
	if (!path) return "";
	return path.replace(/^src\/assets/, "");
}

function markerIcon() {
	return L.divIcon({
		className: "",
		html:
			'<span class="bkc-marker"><span class="bkc-marker__dot">' +
			'<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
			"</span></span>",
		iconSize: [28, 28],
		iconAnchor: [14, 14],
	});
}

function markerEl(layer) {
	return layer.getElement()?.querySelector(".bkc-marker") ?? null;
}

/** sidebar */

function createSidebar() {
	const shell = document.querySelector(".bkc-map-shell");
	const sidebar = document.getElementById("sidebar");

	const field = {
		gambar: document.getElementById("sidebar-gambar"),
		logo: document.getElementById("sidebar-logo"),
		nama: document.getElementById("sidebar-nama"),
		alamat: document.getElementById("sidebar-alamat"),
		ratingValue: document.getElementById("sidebar-rating-value"),
		ratingStars: document.getElementById("sidebar-rating-stars"),
		deskripsi: document.getElementById("sidebar-deskripsi"),
		info: document.getElementById("sidebar-info"),
	};

	function fill(props) {
		field.gambar.src = resolveAsset(props.gambar);
		field.gambar.alt = props.nama ? `Gedung ${props.nama}` : "";
		field.logo.src = resolveAsset(props.logo);
		field.logo.alt = props.nama ? `Logo ${props.nama}` : "";
		field.nama.textContent = props.nama || "";
		field.alamat.textContent = props.alamat || "";
		field.ratingValue.textContent = props.rating ? `${props.rating}/5` : "—";
		field.ratingStars.innerHTML = starsMarkup(props.rating);
		field.deskripsi.textContent = props.deskripsi || "";
		if (props.link) field.info.href = props.link;
	}

	function open(props) {
		fill(props);
		shell.classList.add("has-selection");
	}

	function close() {
		shell.classList.remove("has-selection");
	}

	function isOpen() {
		return shell.classList.contains("has-selection");
	}

	return { open, close, isOpen, sidebarEl: sidebar };
}

/** peta */

async function initMap() {
	const sidebar = createSidebar();
	let selected = null;

	const map = L.map("map").setView(CIMAHI_CENTER, CIMAHI_ZOOM);

	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		maxZoom: 19,
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	}).addTo(map);

	function select(layer) {
		if (selected && selected !== layer) markerEl(selected)?.classList.remove("is-selected");
		markerEl(layer)?.classList.add("is-selected");
		selected = layer;
	}

	function deselect() {
		if (selected) markerEl(selected)?.classList.remove("is-selected");
		selected = null;
	}

	document.getElementById("sidebar-close").addEventListener("click", () => {
		sidebar.close();
		deselect();
	});


	function afterSidebarTransition(fn) {
		sidebar.sidebarEl.addEventListener("transitionend", fn, { once: true });
		setTimeout(fn, 320);
	}

	try {
		const res = await fetch(GEOJSON_URL);
		const geojson = await res.json();

		L.geoJSON(geojson, {
			pointToLayer(feature, latlng) {
				return L.marker(latlng, { icon: markerIcon() });
			},
			onEachFeature(feature, layer) {
				const props = feature.properties || {};

				layer.bindTooltip(props.nama || "", {
					direction: "top",
					offset: [0, -10],
					className: "bkc-tooltip",
				});

				layer.on("mouseover", () => markerEl(layer)?.classList.add("is-hover"));
				layer.on("mouseout", () => markerEl(layer)?.classList.remove("is-hover"));

				layer.on("click", () => {
					const wasClosed = !sidebar.isOpen();
					select(layer);
					sidebar.open(props);
					if (wasClosed) afterSidebarTransition(() => map.invalidateSize());
					map.panTo(layer.getLatLng());
				});
			},
		}).addTo(map);
	} catch (err) {
		console.error("Gagal memuat data titik rumah sakit:", err);
	}
}

initMap();
