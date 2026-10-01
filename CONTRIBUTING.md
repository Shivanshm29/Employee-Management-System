# Contributing to Employee Management System (EMS)

Thank you for your interest in contributing to EMS! We welcome contributions from developers of all backgrounds.

---

## 🛠 Getting Started

1. **Fork the Repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/Shivanshm29/Employee-Management-System.git
   cd Employee-Management-System
   ```
3. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## 💻 Development Workflow

### Backend
- Follow PEP 8 style guidelines for Python code.
- Write migrations whenever modifying Django models:
  ```bash
  python manage.py makemigrations
  python manage.py migrate
  ```
- Ensure sample seed data runs without errors:
  ```bash
  python manage.py seed_data
  ```

### Frontend
- Maintain reusable component structure in `frontend/src/components/`.
- Ensure clean CSS styling aligned with the existing design tokens and color scheme.
- Test across responsive screen sizes.

---

## 📝 Commit Guidelines

We use conventional commit messages to keep the commit history clean:
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation updates
- `style:` Formatting or UI changes that do not affect logic
- `refactor:` Code restructuring without changing external behavior
- `test:` Adding or updating tests
- `chore:` Maintenance tasks or package updates

---

## 🚀 Submitting a Pull Request

1. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch.
3. Provide a clear description of your changes, screenshots (for UI changes), and any testing steps.

---

## 📜 License
By contributing to this repository, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
