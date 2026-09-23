export default function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem" }}>
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "4px solid #D4AF37",
          borderTopColor: "#8B0000",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}