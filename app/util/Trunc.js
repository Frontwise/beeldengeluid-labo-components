const trunc = (s, n) => {
	return s ? s.substr(0, n - 1) + (s.length > n ? "…" : "") : "";
};

export default trunc;
