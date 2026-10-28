export function profileBiography(value: string) {
  return value.startsWith('Replace this')
    ? 'I work in AI content and short-form video operations. I enjoy exploring ideas, creating stories, and understanding how content connects with people.'
    : value;
}
