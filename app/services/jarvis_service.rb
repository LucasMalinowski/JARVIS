class JarvisService
  require "openai"

  def initialize
    @client = OpenAI::Client.new(access_token: Rails.application.credentials.openai[:api_key])
  end

  def send_message(message)
    messages = [
      {
        role: "system",
        content: "Você é Jarvis, um assistente inteligente que responde de forma amigável, concisa e natural. Sempre responda em português brasileiro."
      },
      {
        role: "user",
        content: message
      }
    ]

    response = @client.chat(
      parameters: {
        model: "gpt-4",   # ou "gpt-3.5-turbo" se preferir
        messages: messages,
        temperature: 0.7
      }
    )

    response.dig("choices", 0, "message", "content") || "Desculpe, não consegui processar sua solicitação."
  end
end
