import { useState } from "react";

export function CreateAdAccountForm({ onCreate, isLoading }) {
  const [platform, setPlatform] = useState("facebook");
  const [name, setName] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [accessKey, setAccessKey] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    await onCreate({
      platform,
      name: name.trim(),
      pixel_id: pixelId.trim(),
      access_key: accessKey.trim(),
    });

    setName("");
    setPixelId("");
    setAccessKey("");
  }

  return (
    <section className="card">
      <h2>Добавить рекламный аккаунт</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Платформа
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="google">Google</option>
          </select>
        </label>

        <label>
          Название аккаунта
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Main Facebook Ads"
          />
        </label>

        <label>
          Pixel ID
          <input
            required
            value={pixelId}
            onChange={(event) => setPixelId(event.target.value)}
            placeholder="1234567890"
          />
        </label>

        <label>
          Access key
          <input
            required
            value={accessKey}
            onChange={(event) => setAccessKey(event.target.value)}
            placeholder="secret_key"
          />
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>
    </section>
  );
}
